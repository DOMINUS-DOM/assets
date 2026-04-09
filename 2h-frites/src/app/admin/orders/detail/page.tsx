'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { store } from '@/stores/store';
import { Order, OrderStatus, Driver } from '@/types/order';
import { useLanguage } from '@/i18n/LanguageContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { formatPrice } from '@/utils/format';
import Link from 'next/link';

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received: 'preparing', preparing: 'ready', ready: 'delivering', delivering: 'delivered',
};

function OrderDetail() {
  const params = useSearchParams();
  const id = params.get('id');
  const { t } = useLanguage();
  const [order, setOrder] = useState<Order | undefined>();
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    if (id) {
      setOrder(store.getOrder(id));
      setDrivers(store.getDrivers().filter((d) => d.active));
      return store.subscribe(() => { setOrder(store.getOrder(id)); setDrivers(store.getDrivers().filter((d) => d.active)); });
    }
  }, [id]);

  if (!order) return <p className="text-center text-zinc-500 py-20">{t.ui.order_notFound}</p>;

  const next = order.type === 'pickup' && order.status === 'ready' ? 'picked_up' as OrderStatus : NEXT_STATUS[order.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="text-xs text-amber-400">← {t.ui.admin_orders}</Link>
          <h1 className="text-xl font-bold text-white mt-1">{order.id}</h1>
        </div>
        <span className="text-sm px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300">{t.ui[`status_${order.status}`]}</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {next && (
          <button onClick={() => store.updateOrderStatus(order.id, next)}
            className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95 transition-transform">
            {t.ui.admin_moveTo} {t.ui[`status_${next}`]}
          </button>
        )}
        {order.status !== 'cancelled' && !['delivered', 'picked_up'].includes(order.status) && (
          <button onClick={() => store.updateOrderStatus(order.id, 'cancelled')}
            className="px-4 py-2 rounded-xl bg-zinc-800 text-red-400 font-bold text-sm active:scale-95">
            {t.ui.admin_cancel}
          </button>
        )}
        {order.payment.status === 'pending' && (
          <button onClick={() => store.updatePaymentStatus(order.id, 'paid')}
            className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 font-bold text-sm active:scale-95">
            {t.ui.admin_markPaid}
          </button>
        )}
      </div>

      {order.type === 'delivery' && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{t.ui.admin_driver}</h2>
          <select value={order.driverId || ''} onChange={(e) => store.assignDriver(order.id, e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm">
            <option value="">{t.ui.admin_unassigned}</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.zone}</option>)}
          </select>
        </div>
      )}

      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-1 text-sm">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{t.ui.admin_customer}</h2>
        <p className="text-white font-medium">{order.customer.name}</p>
        <p className="text-zinc-400">{order.customer.phone}</p>
        {order.deliveryAddress && <p className="text-zinc-400">📍 {order.deliveryAddress.street}, {order.deliveryAddress.city} {order.deliveryAddress.postalCode}</p>}
        {order.deliveryAddress?.instructions && <p className="text-zinc-500 italic">💬 {order.deliveryAddress.instructions}</p>}
        {order.pickupTime && <p className="text-zinc-400">🕐 {order.pickupTime}</p>}
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.order_articles}</h2>
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 text-sm">
            <span className="text-white">{item.name} {item.sizeKey ? `(${item.sizeKey})` : ''} × {item.quantity}</span>
            <span className="text-amber-400 font-bold">{formatPrice(item.price * item.quantity)} €</span>
          </div>
        ))}
        <div className="flex justify-between p-3 rounded-xl bg-zinc-800 text-sm">
          <span className="text-white font-bold">{t.ui.cart_total}</span>
          <span className="text-amber-400 font-extrabold">{formatPrice(order.total)} €</span>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.admin_history}</h2>
        {order.statusHistory.map((e, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className="text-zinc-500 text-xs w-12">{new Date(e.at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="text-white">{t.ui[`status_${e.status}`]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-zinc-500 py-10 text-center">...</div>}>
      <OrderDetail />
    </Suspense>
  );
}
