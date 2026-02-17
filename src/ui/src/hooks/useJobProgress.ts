import { useState, useEffect, useRef } from 'react';
import { api, ProgressEntry } from '../api/client';

export function useJobProgress(jobId: string | null | undefined) {
  const [progressLog, setProgressLog] = useState<ProgressEntry[]>([]);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!jobId) {
      setProgressLog([]);
      setIsActive(false);
      return;
    }

    setIsActive(true);

    const poll = async () => {
      try {
        const job = await api.getJob(jobId);
        setProgressLog(job.progress_log || []);
        if (job.status === 'completed' || job.status === 'failed') {
          setIsActive(false);
          clearInterval(intervalRef.current);
        }
      } catch {
        setIsActive(false);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);

    return () => clearInterval(intervalRef.current);
  }, [jobId]);

  return { progressLog, isActive };
}
