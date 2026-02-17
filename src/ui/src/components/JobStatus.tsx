import { useJob } from '../hooks/useJob';

export default function JobStatus({ jobId, onComplete }: { jobId: string | null; onComplete?: () => void }) {
  const { job, isLoading, isComplete, isFailed } = useJob(jobId);

  if (!jobId) return null;

  if (isComplete) {
    onComplete?.();
    return (
      <div style={{
        background: 'var(--color-success-soft)', border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: 'var(--radius-md)', padding: '14px 18px', margin: '16px 0',
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        color: 'var(--color-success)', fontWeight: 500,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        Job completed successfully.
      </div>
    );
  }

  if (isFailed) {
    return (
      <div style={{
        background: 'var(--color-danger-soft)', border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 'var(--radius-md)', padding: '14px 18px', margin: '16px 0',
        fontSize: 13, color: 'var(--color-danger)',
      }}>
        <strong>Job failed:</strong> {job?.error_message || 'Unknown error'}
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-info-soft)', border: '1px solid rgba(59,130,246,0.2)',
      borderRadius: 'var(--radius-md)', padding: '14px 18px', margin: '16px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--color-info)', fontWeight: 500 }}>
        <div style={{
          width: 16, height: 16, border: '2px solid rgba(59,130,246,0.3)',
          borderTopColor: 'var(--color-info)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        {isLoading ? `Processing... (${job?.status || 'starting'})` : 'Waiting...'}
      </div>
      <div style={{ marginTop: 10, height: 4, background: 'rgba(59,130,246,0.1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: 'var(--color-info)',
          width: job?.status === 'running' ? '60%' : '20%',
          transition: 'width 0.5s',
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}
