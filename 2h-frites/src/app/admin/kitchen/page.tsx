'use client';

import { useState, useEffect, useRef } from 'react';
import { OrderStatus } from '@/types/order';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { formatPrice } from '@/utils/format';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const STATUS_FLOW: Record<string, OrderStatus> = {
  received: 'preparing', preparing: 'ready',
};

function KDSContent() {
  const { t } = useLanguage();
  const { locationId } = useLocation();
  const [orders, setOrders] = useState<any[]>([]);
  const [lastCount, setLastCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const locParam = locationId ? `?locationId=${locationId}` : '';
    const refresh = async () => {
      try {
        const all = await api.get<any[]>(`/orders${locParam}`);
        const active = all.filter((o: any) => ['received', 'preparing', 'ready'].includes(o.status));
        if (active.filter((o: any) => o.status === 'received').length > lastCount) {
          try { audioRef.current?.play(); } catch {}
        }
        setLastCount(active.filter((o: any) => o.status === 'received').length);
        setOrders(active);
      } catch {}
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [lastCount]);

  const received = orders.filter((o) => o.status === 'received');
  const preparing = orders.filter((o) => o.status === 'preparing');
  const ready = orders.filter((o) => o.status === 'ready');

  const advance = async (orderId: string, current: string) => {
    const order = orders.find((o: any) => o.id === orderId);
    const next = current === 'ready'
      ? (order?.type === 'pickup' ? 'picked_up' : 'delivering')
      : (STATUS_FLOW as any)[current];
    if (next) await api.post('/orders', { action: 'updateStatus', orderId, status: next });
  };

  const OrderCard = ({ order, color }: { order: any; color: string }) => {
    const mins = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000);
    return (
      <div className={`p-4 rounded-xl border ${color} space-y-2`}>
        <div className="flex items-center justify-between">
          <span className="text-lg font-extrabold text-white">{order.id}</span>
          <span className={`text-xs font-mono ${mins > 15 ? 'text-red-400 animate-pulse' : 'text-zinc-500'}`}>{mins} min</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>{order.type === 'pickup' ? '🏪' : '🛵'}</span>
          <span>{order.customer.name}</span>
          {order.pickupTime && <span className="text-amber-400">🕐 {order.pickupTime}</span>}
        </div>
        <div className="space-y-1">
          {(order.items || []).map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-white">{item.quantity}× {item.name}{item.sizeKey ? ` (${item.sizeKey})` : ''}</span>
            </div>
          ))}
        </div>
        <button onClick={() => advance(order.id, order.status)}
          className="w-full py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95 transition-transform mt-2">
          {order.status === 'received' ? `👨‍🍳 ${t.ui.kds_startPrep}` :
           order.status === 'preparing' ? `✅ ${t.ui.kds_markReady}` :
           order.type === 'pickup' ? `🤝 ${t.ui.kds_markPickedUp}` : `🛵 ${t.ui.kds_sendDelivery}`}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      {/* Hidden audio for new order alert */}
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Ff4F/fXx4eHx/gH+Af4B/gH+Af4B/gH+Af4B/" preload="auto" />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">👨‍🍳 {t.ui.kds_title}</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-400">{received.length} {t.ui.kds_new}</span>
          <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-400">{preparing.length} {t.ui.kds_cooking}</span>
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400">{ready.length} {t.ui.kds_ready}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* New orders */}
        <div>
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">📋 {t.ui.kds_new} ({received.length})</h2>
          <div className="space-y-3">
            {received.map((o) => <OrderCard key={o.id} order={o} color="bg-blue-500/5 border-blue-500/20" />)}
            {received.length === 0 && <p className="text-zinc-600 text-sm text-center py-8">{t.ui.kds_empty}</p>}
          </div>
        </div>

        {/* Preparing */}
        <div>
          <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">👨‍🍳 {t.ui.kds_cooking} ({preparing.length})</h2>
          <div className="space-y-3">
            {preparing.map((o) => <OrderCard key={o.id} order={o} color="bg-amber-500/5 border-amber-500/20" />)}
            {preparing.length === 0 && <p className="text-zinc-600 text-sm text-center py-8">{t.ui.kds_empty}</p>}
          </div>
        </div>

        {/* Ready */}
        <div>
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">✅ {t.ui.kds_ready} ({ready.length})</h2>
          <div className="space-y-3">
            {ready.map((o) => <OrderCard key={o.id} order={o} color="bg-emerald-500/5 border-emerald-500/20" />)}
            {ready.length === 0 && <p className="text-zinc-600 text-sm text-center py-8">{t.ui.kds_empty}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KitchenPage() {
  return (
    <ProtectedRoute allowedRoles={['patron', 'manager', 'employe', 'franchisor_admin', 'location_manager']}>
      <KDSContent />
    </ProtectedRoute>
  );
}
