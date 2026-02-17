import { useJob } from '../hooks/useJob';

export default function JobStatus({ jobId, onComplete }: { jobId: string | null; onComplete?: () => void }) {
  const { job, isLoading, isComplete, isFailed } = useJob(jobId);

  if (!jobId) return null;

  if (isComplete) {
    onComplete?.();
    return (
      <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 4, padding: 12, margin: '12px 0' }}>
        Job completed successfully.
      </div>
    );
  }

  if (isFailed) {
    return (
      <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, padding: 12, margin: '12px 0' }}>
        Job failed: {job?.error_message || 'Unknown error'}
      </div>
    );
  }

  return (
    <div style={{ background: '#cce5ff', border: '1px solid #b8daff', borderRadius: 4, padding: 12, margin: '12px 0' }}>
      {isLoading ? `Processing... (${job?.status || 'starting'})` : 'Waiting...'}
      <div style={{ marginTop: 8, height: 4, background: '#e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: '#007bff',
          width: job?.status === 'running' ? '60%' : '20%',
          transition: 'width 0.5s',
          animation: 'pulse 1.5s infinite',
        }} />
      </div>
    </div>
  );
}
