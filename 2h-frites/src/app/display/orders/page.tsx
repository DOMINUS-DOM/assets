'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useTenant } from '@/contexts/TenantContext';

function DisplayOrdersContent() {
  const searchParams = useSearchParams();
  const siteId = searchParams.get('site');
  const { tenant } = useTenant();
  const displayName = tenant?.branding?.brandName || tenant?.name || 'Restaurant';
  const [orders, setOrders] = useState<any[]>([]);
  const [time, setTime] = useState(new Date());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [lastReadyCount, setLastReadyCount] = useState(0);

  useEffect(() => {
    const locParam = siteId ? `?locationId=${siteId}` : '';
    const fetchOrders = async () => {
      try {
        const all = await api.get<any[]>(`/orders${locParam}`);
        const active = all.filter((o: any) => ['preparing', 'ready'].includes(o.status));
        // Play sound when new order becomes ready
        const readyCount = active.filter((o: any) => o.status === 'ready').length;
        if (readyCount > lastReadyCount) {
          try { audioRef.current?.play(); } catch {}
        }
        setLastReadyCount(readyCount);
        setOrders(active);
      } catch {}
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, [lastReadyCount]);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const preparing = orders.filter((o) => o.status === 'preparing');
  const ready = orders.filter((o) => o.status === 'ready');

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Ff4F/fXx4eHx/gH+Af4B/gH+Af4B/gH+Af4B/" preload="auto" />

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          {tenant?.branding?.logoUrl || tenant?.branding?.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.branding.logoUrl || tenant.branding.faviconUrl} alt={displayName} className="h-12 w-auto object-contain" />
          ) : (
            <span className="text-4xl">🍽️</span>
          )}
          <h1 className="text-2xl font-extrabold text-white truncate max-w-[20rem]">{displayName}</h1>
        </div>
        <p className="text-3xl font-bold text-amber-400 tabular-nums">
          {time.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Two columns: preparing | ready */}
      <div className="flex-1 grid grid-cols-2 gap-0">
        {/* Preparing */}
        <div className="border-r border-zinc-800 p-6">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="text-lg">👨‍🍳</span> En préparation ({preparing.length})
          </h2>
          <div className="space-y-3">
            {preparing.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <div>
                  <p className="text-3xl font-black text-white">{o.orderNumber}</p>
                  <p className="text-sm text-zinc-400 mt-1">{o.customerName} — {o.type === 'pickup' ? '🏪' : '🛵'}</p>
                </div>
                <span className="text-4xl">👨‍🍳</span>
              </div>
            ))}
            {preparing.length === 0 && (
              <p className="text-zinc-600 text-center py-12 text-lg">Aucune commande en préparation</p>
            )}
          </div>
        </div>

        {/* Ready */}
        <div className="p-6 bg-emerald-500/5">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="text-lg">✅</span> PRÊTES ! ({ready.length})
          </h2>
          <div className="space-y-3">
            {ready.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 animate-pulse">
                <div>
                  <p className="text-4xl font-black text-emerald-400">{o.orderNumber}</p>
                  <p className="text-sm text-zinc-400 mt-1">{o.customerName}</p>
                </div>
                <span className="text-5xl">🎉</span>
              </div>
            ))}
            {ready.length === 0 && (
              <p className="text-zinc-600 text-center py-12 text-lg">En attente...</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-8 py-2 bg-zinc-900 border-t border-zinc-800 text-center">
        <p className="text-xs text-zinc-500">Commandez en ligne</p>
      </div>
    </div>
  );
}

export default function DisplayOrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><span className="text-4xl">🍟</span></div>}>
      <DisplayOrdersContent />
    </Suspense>
  );
}
