import { useState, useEffect, useCallback, useRef } from 'react';
import { api, AppLog } from '../api/client';

const LEVEL_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  error: { bg: 'var(--color-danger-soft)', text: 'var(--color-danger)', badge: 'var(--color-danger)' },
  warn: { bg: 'var(--color-warning-soft)', text: '#92400e', badge: 'var(--color-warning)' },
  info: { bg: 'var(--color-info-soft)', text: 'var(--color-info)', badge: 'var(--color-info)' },
  debug: { bg: 'var(--color-bg)', text: 'var(--color-text-secondary)', badge: 'var(--color-text-muted)' },
};

const LEVELS = ['all', 'error', 'warn', 'info', 'debug'] as const;

export default function Logs() {
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    try {
      const result = await api.getLogs({
        level: level === 'all' ? undefined : level,
        search: search || undefined,
        limit,
        offset: page * limit,
      });
      setLogs(result.logs);
      setTotal(result.total);
    } catch {
      // Silently fail on poll
    } finally {
      setLoading(false);
    }
  }, [level, search, page]);

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(fetchLogs, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchLogs]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const totalPages = Math.ceil(total / limit);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  const formatDate = (ts: string) => {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>System Logs</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: 0 }}>
            Monitor application activity, errors, and AI processing in real-time.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{
            fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: 'var(--color-accent)' }}
            />
            Auto-refresh
          </label>
          <span style={{
            fontSize: 11, color: 'var(--color-text-muted)',
            background: 'var(--color-bg)', padding: '4px 10px',
            borderRadius: 20, fontWeight: 500,
          }}>
            {total} total
          </span>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {LEVELS.map(l => (
          <button
            key={l}
            onClick={() => { setLevel(l); setPage(0); }}
            style={{
              padding: '5px 14px',
              border: level === l ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
              borderRadius: 20,
              background: level === l ? 'var(--color-accent-soft)' : 'var(--color-surface)',
              color: level === l ? 'var(--color-accent)' : (l !== 'all' ? LEVEL_COLORS[l]?.badge || 'var(--color-text-secondary)' : 'var(--color-text-secondary)'),
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: level === l ? 600 : 400,
              textTransform: 'capitalize',
              transition: 'all var(--transition)',
            }}
          >
            {l}
          </button>
        ))}

        <div style={{ flex: 1, minWidth: 200, display: 'flex', gap: 6 }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search logs..."
            style={{
              flex: 1, padding: '7px 14px', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', fontSize: 13, outline: 'none',
              background: 'var(--color-surface)', transition: 'border-color var(--transition)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '7px 14px', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)', cursor: 'pointer', fontSize: 12,
              transition: 'all var(--transition)',
            }}
          >
            Search
          </button>
          {search && (
            <button
              onClick={() => { setSearchInput(''); setSearch(''); setPage(0); }}
              style={{
                padding: '7px 10px', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)', cursor: 'pointer', fontSize: 12,
                color: 'var(--color-danger)',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Log entries */}
      {loading && logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{
            width: 24, height: 24, border: '2px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto',
          }} />
        </div>
      ) : logs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
        }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No logs found.</p>
        </div>
      ) : (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          background: 'var(--color-surface)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '80px 60px 1fr',
            padding: '8px 16px',
            background: 'var(--color-bg)',
            borderBottom: '1px solid var(--color-border)',
            fontWeight: 600,
            fontSize: 10,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'var(--font-heading)',
          }}>
            <span>Time</span>
            <span>Level</span>
            <span>Message</span>
          </div>

          {logs.map(log => {
            const colors = LEVEL_COLORS[log.level] || LEVEL_COLORS.info;
            const isExpanded = expandedId === log.id;
            const hasMeta = Object.keys(log.meta).length > 0;

            return (
              <div key={log.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 60px 1fr',
                    padding: '6px 16px',
                    borderBottom: '1px solid var(--color-border-light)',
                    cursor: hasMeta ? 'pointer' : 'default',
                    background: isExpanded ? 'var(--color-bg)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg)'; }}
                  onMouseLeave={(e) => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <span style={{ color: 'var(--color-text-muted)' }} title={formatDate(log.timestamp)}>
                    {formatTime(log.timestamp)}
                  </span>
                  <span style={{
                    color: colors.badge,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: 10,
                    lineHeight: '18px',
                    fontFamily: 'var(--font-heading)',
                  }}>
                    {log.level}
                  </span>
                  <span style={{
                    color: colors.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                    wordBreak: 'break-word',
                  }}>
                    {log.message}
                    {hasMeta && !isExpanded && (
                      <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}> +meta</span>
                    )}
                  </span>
                </div>
                {isExpanded && hasMeta && (
                  <div style={{
                    padding: '10px 16px 10px 156px',
                    background: 'var(--color-bg)',
                    borderBottom: '1px solid var(--color-border-light)',
                  }}>
                    <pre style={{
                      margin: 0,
                      fontSize: 11,
                      color: 'var(--color-text-secondary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}>
                      {JSON.stringify(log.meta, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20, alignItems: 'center' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: '6px 14px', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)', cursor: page === 0 ? 'not-allowed' : 'pointer',
              fontSize: 12, transition: 'all var(--transition)',
              opacity: page === 0 ? 0.5 : 1,
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              padding: '6px 14px', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              fontSize: 12, transition: 'all var(--transition)',
              opacity: page >= totalPages - 1 ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
