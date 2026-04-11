'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';
import Link from 'next/link';

const DeliveryMap = dynamic(() => import('@/components/DeliveryMap'), { ssr: false });

const STATUS_EMOJI: Record<string, string> = {
  received: '📋', preparing: '👨‍🍳', ready: '✅', delivering: '🛵', delivered: '📦', picked_up: '🤝', cancelled: '❌',
};

function TrackContent() {
  const params = useSearchParams();
  const orderId = params.get('id');
  const { t } = useLanguage();
  const [order, setOrder] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);

  useEffect(() => {
    if (!orderId) return;
    const fetchData = async () => {
      try {
        const orders = await api.get<any[]>('/orders');
        const o = orders.find((x: any) => x.orderNumber === orderId || x.id === orderId);
        setOrder(o || null);

        // Fetch driver location if delivering
        if (o?.driverId && o.status === 'delivering') {
          const drivers = await api.get<any[]>('/drivers/location');
          const d = drivers.find((x: any) => x.id === o.driverId);
          if (d) setDriver(d);
        }
      } catch {}
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (!order) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <span className="text-5xl block mb-4">🔍</span>
          <p className="text-zinc-400">{t.ui.order_notFound}</p>
          <Link href="/" className="text-amber-400 text-sm mt-4 block">← Menu</Link>
        </div>
      </div>
    );
  }

  const isDelivering = order.status === 'delivering' && driver?.lastLat;
  // Use a stable hash of the order ID for a consistent position offset (not random each render)
  const hash = (order.id || '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
  const deliveryDest: [number, number] | undefined = order.deliveryStreet
    ? [50.479 + ((hash % 100) / 10000), 4.186 + ((hash % 73) / 10000)]
    : undefined;

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="text-amber-400 font-medium text-sm">← Menu</Link>
          <h1 className="text-sm font-bold text-white">{order.orderNumber}</h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Status hero */}
        <div className="text-center py-4">
          <span className="text-5xl block mb-2">{(STATUS_EMOJI as any)[order.status] || '📋'}</span>
          <p className="text-lg font-bold text-white">{t.ui[`status_${order.status}`]}</p>
          {isDelivering && <p className="text-xs text-amber-400 animate-pulse mt-1">{t.ui.track_onTheWay}</p>}
        </div>

        {/* Live map when delivering */}
        {isDelivering && (
          <div className="animate-fade-in">
            <DeliveryMap
              zones={[]}
              drivers={[{ id: driver.id, name: driver.name, lat: driver.lastLat, lng: driver.lastLng }]}
              customerLocation={deliveryDest}
              center={[driver.lastLat, driver.lastLng]}
              height="250px"
            />
            <div className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-zinc-900 border border-amber-500/20">
              <span className="text-2xl">🛵</span>
              <div>
                <p className="text-sm font-bold text-white">{driver.name}</p>
                <p className="text-xs text-zinc-400">{t.ui.track_driverOnWay}</p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.order_tracking}</h2>
          {(order.statusHistory || []).map((entry: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${i === (order.statusHistory?.length || 0) - 1 ? 'bg-amber-500/20' : 'bg-zinc-800'}`}>
                {(STATUS_EMOJI as any)[entry.status]}
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{t.ui[`status_${entry.status}`]}</p>
                <p className="text-xs text-zinc-500">{new Date(entry.at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <div className="flex justify-between">
            <span className="text-sm text-zinc-400">{t.ui.cart_total}</span>
            <span className="text-lg font-extrabold text-amber-400">{formatPrice(order.total)} €</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><span className="text-2xl animate-pulse">🍟</span></div>}>
      <TrackContent />
    </Suspense>
  );
}
