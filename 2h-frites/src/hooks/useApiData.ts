'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export function useApiData<T>(path: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await api.get<T>(path);
      setData(result);
    } catch {}
    setLoading(false);
  }, [path]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, refresh, setData };
}
