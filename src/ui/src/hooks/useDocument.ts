import { useState, useEffect, useCallback } from 'react';
import { api, Document } from '../api/client';

export function useDocuments(slug: string | undefined) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const data = await api.getDocuments(slug);
      setDocuments(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { refresh(); }, [refresh]);

  return { documents, loading, refresh };
}
