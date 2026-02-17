import { useState, useEffect, useCallback, useRef } from 'react';
import { api, AppLog } from '../api/client';

const LEVEL_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  error: { bg: '#f8d7da', text: '#721c24', badge: '#d9534f' },
  warn: { bg: '#fff3cd', text: '#856404', badge: '#f0ad4e' },
  info: { bg: '#d1ecf1', text: '#0c5460', badge: '#17a2b8' },
  debug: { bg: '#e2e3e5', text: '#383d41', badge: '#6c757d' },
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Logs</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <span style={{ fontSize: 12, color: '#999' }}>{total} total</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {LEVELS.map(l => (
          <button
            key={l}
            onClick={() => { setLevel(l); setPage(0); }}
            style={{
              padding: '4px 12px',
              border: level === l ? '2px solid #1a1a2e' : '1px solid #ddd',
              borderRadius: 16,
              background: level === l ? '#1a1a2e' : '#fff',
              color: level === l ? '#fff' : (l !== 'all' ? LEVEL_COLORS[l]?.badge || '#333' : '#333'),
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: level === l ? 600 : 400,
              textTransform: 'capitalize',
            }}
          >
            {l}
          </button>
        ))}

        <div style={{ flex: 1, minWidth: 200, display: 'flex', gap: 4 }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search logs..."
            style={{
              flex: 1, padding: '6px 12px', border: '1px solid #ddd',
              borderRadius: 4, fontSize: 13,
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4,
              background: '#f8f9fa', cursor: 'pointer', fontSize: 13,
            }}
          >
            Search
          </button>
          {search && (
            <button
              onClick={() => { setSearchInput(''); setSearch(''); setPage(0); }}
              style={{
                padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4,
                background: '#f8f9fa', cursor: 'pointer', fontSize: 13, color: '#d9534f',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Log entries */}
      {loading && logs.length === 0 ? (
        <p style={{ color: '#999' }}>Loading logs...</p>
      ) : logs.length === 0 ? (
        <p style={{ color: '#999' }}>No logs found.</p>
      ) : (
        <div style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          border: '1px solid #ddd',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '80px 60px 1fr',
            padding: '6px 12px',
            background: '#f8f9fa',
            borderBottom: '1px solid #ddd',
            fontWeight: 600,
            fontSize: 11,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
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
                    padding: '5px 12px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: hasMeta ? 'pointer' : 'default',
                    background: isExpanded ? '#f8f9fa' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = '#fafafa'; }}
                  onMouseLeave={(e) => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <span style={{ color: '#999' }} title={formatDate(log.timestamp)}>
                    {formatTime(log.timestamp)}
                  </span>
                  <span style={{
                    color: colors.badge,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: 10,
                    lineHeight: '18px',
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
                      <span style={{ color: '#ccc', marginLeft: 8 }}> +meta</span>
                    )}
                  </span>
                </div>
                {isExpanded && hasMeta && (
                  <div style={{
                    padding: '8px 12px 8px 152px',
                    background: '#f8f9fa',
                    borderBottom: '1px solid #eee',
                  }}>
                    <pre style={{
                      margin: 0,
                      fontSize: 11,
                      color: '#555',
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: '4px 12px', border: '1px solid #ddd', borderRadius: 4,
              background: '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 13,
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: '#666' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              padding: '4px 12px', border: '1px solid #ddd', borderRadius: 4,
              background: '#fff', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: 13,
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
