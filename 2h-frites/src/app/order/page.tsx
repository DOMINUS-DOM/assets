'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { store } from '@/stores/store';
import { Order, OrderStatus } from '@/types/order';
import { formatPrice } from '@/utils/format';
import Link from 'next/link';

const STATUS_CONFIG: Record<OrderStatus, { label: string; emoji: string; color: string }> = {
  received: { label: 'Reçue', emoji: '📋', color: 'text-blue-400' },
  preparing: { label: 'En préparation', emoji: '👨‍🍳', color: 'text-yellow-400' },
  ready: { label: 'Prête', emoji: '✅', color: 'text-emerald-400' },
  delivering: { label: 'En livraison', emoji: '🛵', color: 'text-orange-400' },
  delivered: { label: 'Livrée', emoji: '📦', color: 'text-emerald-400' },
  picked_up: { label: 'Récupérée', emoji: '🤝', color: 'text-emerald-400' },
  cancelled: { label: 'Annulée', emoji: '❌', color: 'text-red-400' },
};

function OrderContent() {
  const params = useSearchParams();
  const orderId = params.get('id');
  const [order, setOrder] = useState<Order | undefined>();

  useEffect(() => {
    if (orderId) {
      setOrder(store.getOrder(orderId));
      const unsub = store.subscribe(() => setOrder(store.getOrder(orderId)));
      return unsub;
    }
  }, [orderId]);

  if (!orderId || !order) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <span className="text-5xl block mb-4">🔍</span>
          <p className="text-zinc-400 mb-4">Commande introuvable</p>
          <Link href="/" className="text-amber-400 font-medium text-sm">← Menu</Link>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[order.status];

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
        {/* Status hero */}
        <div className="text-center py-6">
          <span className="text-6xl block mb-3">{cfg.emoji}</span>
          <p className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {order.type === 'pickup' ? '🏪 Retrait sur place' : '🛵 Livraison'}
          </p>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Suivi</h2>
          {order.statusHistory.map((entry, i) => {
            const s = STATUS_CONFIG[entry.status];
            const time = new Date(entry.at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                  ${i === order.statusHistory.length - 1 ? 'bg-amber-500/20' : 'bg-zinc-800'}`}>
                  {s.emoji}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">{s.label}</p>
                  <p className="text-xs text-zinc-500">{time}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Items */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Articles</h2>
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

        {/* Total */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Total</span>
            <span className="text-xl font-extrabold text-amber-400">{formatPrice(order.total)} €</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {order.payment.method === 'online' ? '💳 En ligne' : order.payment.method === 'on_delivery' ? '💶 À la livraison' : '💶 Sur place'}
            {' — '}{order.payment.status === 'paid' ? '✅ Payé' : '⏳ En attente'}
          </p>
        </div>

        {/* Customer info */}
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
