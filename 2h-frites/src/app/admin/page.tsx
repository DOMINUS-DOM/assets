'use client';

import { useState, useEffect } from 'react';
import { store } from '@/stores/store';
import { Order } from '@/types/order';
import { formatPrice } from '@/utils/format';
import Link from 'next/link';

function StatCard({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
      <span className="text-2xl">{emoji}</span>
      <p className="text-2xl font-extrabold text-white mt-2">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(store.getOrders());
    return store.subscribe(() => setOrders(store.getOrders()));
  }, []);

  const today = orders; // All demo orders are "today"
  const revenue = today.reduce((sum, o) => sum + o.total, 0);
  const pending = today.filter((o) => o.status === 'received').length;
  const preparing = today.filter((o) => o.status === 'preparing').length;
  const delivering = today.filter((o) => o.status === 'delivering').length;
  const done = today.filter((o) => ['delivered', 'picked_up'].includes(o.status)).length;

  const recent = [...orders].slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard emoji="📋" label="Commandes du jour" value={today.length} />
        <StatCard emoji="💰" label="Chiffre du jour" value={`${formatPrice(revenue)} €`} />
        <StatCard emoji="⏳" label="En attente" value={pending} />
        <StatCard emoji="👨‍🍳" label="En préparation" value={preparing} />
        <StatCard emoji="🛵" label="En livraison" value={delivering} />
        <StatCard emoji="✅" label="Terminées" value={done} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Dernières commandes</h2>
          <Link href="/admin/orders" className="text-xs text-amber-400">Voir tout →</Link>
        </div>
        <div className="space-y-2">
          {recent.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/detail?id=${o.id}`}
              className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50
                hover:border-zinc-700 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-white">{o.id}</p>
                <p className="text-xs text-zinc-500">{o.customer.name} — {o.type === 'pickup' ? '🏪' : '🛵'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-amber-400">{formatPrice(o.total)} €</p>
                <p className="text-xs text-zinc-500">{o.status}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
