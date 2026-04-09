'use client';

import { useState, useEffect, useRef } from 'react';

export function useSSE<T>(channel: string, fallback: T, locationId?: string): { data: T; connected: boolean } {
  const [data, setData] = useState<T>(fallback);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams({ channel });
    if (locationId) params.set('locationId', locationId);

    const es = new EventSource(`/api/sse?${params}`);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'init' || payload.type === 'update') {
          // Extract the relevant data from the payload
          const key = Object.keys(payload).find((k) => k !== 'type');
          if (key) setData(payload[key]);
        }
      } catch {}
    };

    es.onerror = () => {
      setConnected(false);
      // Auto-reconnect after 5s
      setTimeout(() => {
        if (esRef.current === es) {
          es.close();
          esRef.current = null;
        }
      }, 5000);
    };

    return () => { es.close(); esRef.current = null; };
  }, [channel, locationId]);

  return { data, connected };
}
