'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { store } from '@/stores/store';
import { Order, OrderStatus } from '@/types/order';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';
import Link from 'next/link';

function statusKey(s: OrderStatus) { return `status_${s}` as const; }
const STATUS_EMOJI: Record<OrderStatus, string> = {
  received: '📋', preparing: '👨‍🍳', ready: '✅', delivering: '🛵', delivered: '📦', picked_up: '🤝', cancelled: '❌',
};
const STATUS_COLOR: Record<OrderStatus, string> = {
  received: 'text-blue-400', preparing: 'text-yellow-400', ready: 'text-emerald-400', delivering: 'text-orange-400',
  delivered: 'text-emerald-400', picked_up: 'text-emerald-400', cancelled: 'text-red-400',
};

function OrderContent() {
  const params = useSearchParams();
  const orderId = params.get('id');
  const { t } = useLanguage();
  const [order, setOrder] = useState<Order | undefined>();

  useEffect(() => {
    if (orderId) {
      setOrder(store.getOrder(orderId));
      return store.subscribe(() => setOrder(store.getOrder(orderId)));
    }
  }, [orderId]);

  if (!orderId || !order) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <span className="text-5xl block mb-4">🔍</span>
          <p className="text-zinc-400 mb-4">{t.ui.order_notFound}</p>
          <Link href="/" className="text-amber-400 font-medium text-sm">← Menu</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="text-amber-400 font-medium text-sm">← Menu</Link>
          <h1 className="text-sm font-bold text-white">{order.id}</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6">
        <div className="text-center py-6">
          <span className="text-6xl block mb-3">{STATUS_EMOJI[order.status]}</span>
          <p className={`text-xl font-bold ${STATUS_COLOR[order.status]}`}>{t.ui[statusKey(order.status)]}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {order.type === 'pickup' ? t.ui.order_pickupLabel : t.ui.order_deliveryLabel}
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.order_tracking}</h2>
          {order.statusHistory.map((entry, i) => {
            const time = new Date(entry.at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${i === order.statusHistory.length - 1 ? 'bg-amber-500/20' : 'bg-zinc-800'}`}>
                  {STATUS_EMOJI[entry.status]}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">{t.ui[statusKey(entry.status)]}</p>
                  <p className="text-xs text-zinc-500">{time}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.order_articles}</h2>
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div>
                <p className="text-sm text-white font-medium">{item.name}</p>
                <p className="text-xs text-zinc-500">× {item.quantity}</p>
              </div>
              <span className="text-sm font-bold text-amber-400">{formatPrice(item.price * item.quantity)} €</span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">{t.ui.cart_total}</span>
            <span className="text-xl font-extrabold text-amber-400">{formatPrice(order.total)} €</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {order.payment.method === 'online' ? t.ui.order_online : order.payment.method === 'on_delivery' ? t.ui.order_onDelivery : t.ui.order_onPickup}
            {' — '}{order.payment.status === 'paid' ? t.ui.order_paid : t.ui.order_pendingPay}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-sm space-y-1">
          <p className="text-white font-medium">{order.customer.name}</p>
          <p className="text-zinc-400">{order.customer.phone}</p>
          {order.deliveryAddress && (
            <p className="text-zinc-400">{order.deliveryAddress.street}, {order.deliveryAddress.city} {order.deliveryAddress.postalCode}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><span className="text-2xl animate-pulse">🍟</span></div>}>
      <OrderContent />
    </Suspense>
  );
}
