'use client';

import { useState, useEffect } from 'react';
import { store } from '@/stores/store';
import { Order, OrderStatus } from '@/types/order';
import { formatPrice } from '@/utils/format';
import Link from 'next/link';

const STATUSES: (OrderStatus | 'all')[] = ['all', 'received', 'preparing', 'ready', 'delivering', 'delivered', 'picked_up', 'cancelled'];
const STATUS_EMOJI: Record<string, string> = {
  all: '📋', received: '⏳', preparing: '👨‍🍳', ready: '✅', delivering: '🛵', delivered: '📦', picked_up: '🤝', cancelled: '❌',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  useEffect(() => {
    setOrders(store.getOrders());
    return store.subscribe(() => setOrders(store.getOrders()));
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Commandes</h1>

      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'
            }`}
          >
            {STATUS_EMOJI[s]} {s === 'all' ? 'Toutes' : s} ({s === 'all' ? orders.length : orders.filter((o) => o.status === s).length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((o) => (
          <Link
            key={o.id}
            href={`/admin/orders/detail?id=${o.id}`}
            className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50
              hover:border-zinc-700 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{o.id}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {o.type === 'pickup' ? '🏪 Retrait' : '🛵 Livraison'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{o.customer.name} — {o.customer.phone}</p>
              <p className="text-xs text-zinc-600">{new Date(o.createdAt).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="text-sm font-bold text-amber-400">{formatPrice(o.total)} €</p>
              <p className="text-xs text-zinc-500">{STATUS_EMOJI[o.status]} {o.status}</p>
              <p className="text-xs text-zinc-600">
                {o.payment.status === 'paid' ? '✅ Payé' : '⏳ Non payé'}
              </p>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-zinc-500 py-8 text-sm">Aucune commande</p>
        )}
      </div>
    </div>
  );
}
