import { ProgressEntry } from '../api/client';

interface Props {
  entries: ProgressEntry[];
  isActive: boolean;
}

export default function ProgressLog({ entries, isActive }: Props) {
  if (entries.length === 0 && !isActive) return null;

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
      maxHeight: 220,
      overflowY: 'auto',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--color-text-muted)',
        marginBottom: 10, fontFamily: 'var(--font-heading)',
      }}>
        Progress
      </div>

      {entries.length === 0 && isActive && (
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)',
            display: 'inline-block', animation: 'pulse 1.5s infinite',
          }} />
          Initializing...
        </div>
      )}

      {entries.map((entry, i) => {
        const isLast = i === entries.length - 1;
        const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return (
          <div key={i} style={{
            fontSize: 13,
            color: isLast && isActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
            fontWeight: isLast && isActive ? 500 : 400,
            padding: '4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            {isLast && isActive ? (
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)',
                display: 'inline-block', animation: 'pulse 1.5s infinite', flexShrink: 0,
              }} />
            ) : (
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)',
                display: 'inline-block', flexShrink: 0,
              }} />
            )}
            <span style={{ color: 'var(--color-text-muted)', fontSize: 11, minWidth: 60, fontFamily: 'var(--font-mono)' }}>{time}</span>
            <span>{entry.message}</span>
          </div>
        );
      })}
    </div>
  );
}
