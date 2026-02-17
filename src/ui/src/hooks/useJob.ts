import { useState, useEffect, useRef } from 'react';
import { api, Job } from '../api/client';

export function useJob(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!jobId) return;

    setIsLoading(true);

    const poll = async () => {
      try {
        const j = await api.getJob(jobId);
        setJob(j);
        if (j.status === 'completed' || j.status === 'failed') {
          clearInterval(intervalRef.current);
          setIsLoading(false);
        }
      } catch {
        setIsLoading(false);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);

    return () => clearInterval(intervalRef.current);
  }, [jobId]);

  return {
    job,
    isLoading,
    isComplete: job?.status === 'completed',
    isFailed: job?.status === 'failed',
  };
}
