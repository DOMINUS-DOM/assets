'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import { useApiData } from '@/hooks/useApiData';
import { useLocation } from '@/contexts/LocationContext';
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
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const { data: orders } = useApiData<any[]>(`/orders${locParam}`, []);
  const { t } = useLanguage();

  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pending = orders.filter((o) => o.status === 'received').length;
  const preparing = orders.filter((o) => o.status === 'preparing').length;
  const delivering = orders.filter((o) => o.status === 'delivering').length;
  const done = orders.filter((o) => ['delivered', 'picked_up'].includes(o.status)).length;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard emoji="📋" label={t.ui.admin_ordersToday} value={orders.length} />
        <StatCard emoji="💰" label={t.ui.admin_revenueToday} value={`${formatPrice(revenue)} €`} />
        <StatCard emoji="⏳" label={t.ui.admin_pending} value={pending} />
        <StatCard emoji="👨‍🍳" label={t.ui.admin_preparing} value={preparing} />
        <StatCard emoji="🛵" label={t.ui.admin_inDelivery} value={delivering} />
        <StatCard emoji="✅" label={t.ui.admin_completed} value={done} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t.ui.admin_latestOrders}</h2>
          <Link href="/admin/orders" className="text-xs text-amber-400">{t.ui.admin_seeAll}</Link>
        </div>
        <div className="space-y-2">
          {orders.slice(0, 5).map((o) => (
            <Link key={o.id} href={`/admin/orders/detail?id=${o.id}`}
              className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
              <div>
                <p className="text-sm font-semibold text-white">{o.id}</p>
                <p className="text-xs text-zinc-500">{o.customerName} — {o.type === 'pickup' ? '🏪' : '🛵'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-amber-400">{formatPrice(o.total)} €</p>
                <p className="text-xs text-zinc-500">{t.ui[`status_${o.status}`]}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
