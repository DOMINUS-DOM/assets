'use client';

import { useState } from 'react';
import { OrderStatus } from '@/types/order';
import { useLanguage } from '@/i18n/LanguageContext';
import { useApiData } from '@/hooks/useApiData';
import { useLocation } from '@/contexts/LocationContext';
import { formatPrice } from '@/utils/format';
import Link from 'next/link';

const STATUSES: (OrderStatus | 'all')[] = ['all', 'received', 'preparing', 'ready', 'delivering', 'delivered', 'picked_up', 'cancelled'];

export default function OrdersPage() {
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const { data: orders } = useApiData<any[]>(`/orders${locParam}`, []);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const { t } = useLanguage();

  const byStatus = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
  const filtered = search
    ? byStatus.filter((o) =>
        (o.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.customerPhone || '').includes(search)
      )
    : byStatus;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white shrink-0">{t.ui.admin_orders}</h1>
        <input
          type="text"
          placeholder="Rechercher (n°, nom, tel)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 w-48"
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {STATUSES.map((s) => {
          const label = s === 'all' ? t.ui.admin_all : (t.ui[`status_${s}`] || s);
          const cnt = s === 'all' ? orders.length : orders.filter((o) => o.status === s).length;
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
              {label} ({cnt})
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        {filtered.map((o) => (
          <Link key={o.id} href={`/admin/orders/detail?id=${o.id}`}
            className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{o.orderNumber || o.id}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {o.type === 'dine_in' ? 'Sur place' : o.type === 'pickup' ? t.ui.admin_pickup : t.ui.admin_deliveryMode}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{o.customerName} — {o.customerPhone}</p>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="text-sm font-bold text-amber-400">{formatPrice(o.total)} €</p>
              <p className="text-xs text-zinc-500">{t.ui[`status_${o.status}`]}</p>
              <p className="text-xs text-zinc-600">{o.paymentStatus === 'paid' ? t.ui.admin_paidLabel : t.ui.admin_unpaidLabel}</p>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-center text-zinc-500 py-8 text-sm">{t.ui.admin_noOrders}</p>}
      </div>
    </div>
  );
}
