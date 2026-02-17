import { ProgressEntry } from '../api/client';

interface Props {
  entries: ProgressEntry[];
  isActive: boolean;
}

export default function ProgressLog({ entries, isActive }: Props) {
  if (entries.length === 0 && !isActive) return null;

  return (
    <div style={{
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: 4,
      padding: 12,
      marginBottom: 16,
      maxHeight: 200,
      overflowY: 'auto',
    }}>
      {entries.length === 0 && isActive && (
        <div style={{ color: '#666', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#007bff',
            display: 'inline-block', animation: 'pulse 1.5s infinite',
          }} />
          Starting...
        </div>
      )}
      {entries.map((entry, i) => {
        const isLast = i === entries.length - 1;
        const time = new Date(entry.timestamp).toLocaleTimeString();
        return (
          <div key={i} style={{
            fontSize: 13,
            color: isLast && isActive ? '#212529' : '#666',
            fontWeight: isLast && isActive ? 600 : 400,
            padding: '2px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            {isLast && isActive ? (
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#007bff',
                display: 'inline-block', animation: 'pulse 1.5s infinite',
              }} />
            ) : (
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#28a745',
                display: 'inline-block',
              }} />
            )}
            <span style={{ color: '#999', fontSize: 11, minWidth: 70 }}>{time}</span>
            {entry.message}
          </div>
        );
      })}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
