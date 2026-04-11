'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export function useApiData<T>(path: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const result = await api.get<T>(path);
      setData(result);
    } catch (e: any) {
      setError(e?.error || 'fetch_error');
      console.warn(`[useApiData] ${path} failed:`, e);
    }
    setLoading(false);
  }, [path]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh, setData };
}
