'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import { useApiData } from '@/hooks/useApiData';
import { useLocation } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/utils/format';
import Link from 'next/link';
import NavIcon from '@/components/admin/NavIcon';

function StatCard({ label, value, icon, trend }: { label: string; value: string | number; icon: string; trend?: string }) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900 dark:bg-zinc-900 bg-white border border-zinc-800/50 dark:border-zinc-800/50 border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <NavIcon name={icon} className="text-zinc-500 w-4 h-4" />
        {trend && <span className="text-[10px] text-emerald-400 font-medium">{trend}</span>}
      </div>
      <p className="text-2xl font-extrabold text-white dark:text-white text-gray-900">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { locationId, locationName, locations } = useLocation();
  const { user } = useAuth();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const { data: orders } = useApiData<any[]>(`/orders${locParam}`, []);
  const { t } = useLanguage();

  // Today's orders
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.createdAt?.slice(0, 10) === today);
  const revenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const pending = todayOrders.filter((o) => o.status === 'received').length;
  const preparing = todayOrders.filter((o) => o.status === 'preparing').length;
  const delivering = todayOrders.filter((o) => o.status === 'delivering').length;
  const done = todayOrders.filter((o) => ['delivered', 'picked_up'].includes(o.status)).length;
  const avgTicket = todayOrders.length > 0 ? revenue / todayOrders.length : 0;

  // Active orders (need attention)
  const activeOrders = orders.filter((o) => ['received', 'preparing', 'ready', 'delivering'].includes(o.status));

  // Compare with all-time if viewing "Tous les sites"
  const isAllSites = !locationId;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-white dark:text-white text-gray-900">
          Bonjour{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          {locationName} — {new Date().toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard icon="orders" label="Commandes du jour" value={todayOrders.length} />
        <StatCard icon="payroll" label="Chiffre du jour" value={`${formatPrice(revenue)} €`} />
        <StatCard icon="analytics" label="Panier moyen" value={`${formatPrice(avgTicket)} €`} />
        <StatCard icon="kitchen" label="En cours" value={activeOrders.length} />
      </div>

      {/* Active orders requiring attention */}
      {activeOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Commandes actives</h2>
            <Link href="/admin/orders" className="text-xs text-amber-400">{t.ui.admin_seeAll}</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeOrders.slice(0, 6).map((o) => {
              const statusColor: Record<string, string> = {
                received: 'border-l-red-500', preparing: 'border-l-amber-500',
                ready: 'border-l-emerald-500', delivering: 'border-l-blue-500',
              };
              return (
                <Link key={o.id} href={`/admin/orders/detail?id=${o.id}`}
                  className={`flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 border-l-4 ${statusColor[o.status] || ''} hover:border-zinc-700 transition-colors`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{o.orderNumber || o.id}</p>
                    <p className="text-xs text-zinc-500">{o.customerName || '—'} — {o.type === 'pickup' ? '🏪' : '🛵'}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-bold text-amber-400">{formatPrice(o.total)} €</p>
                    <p className="text-[10px] text-zinc-500">{t.ui[`status_${o.status}`] || o.status}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Acces rapide</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link href="/pos" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center hover:bg-amber-500/15 transition-colors">
            <NavIcon name="payments" className="mx-auto text-amber-400 mb-1" />
            <p className="text-xs font-bold text-amber-400">Caisse POS</p>
          </Link>
          <Link href="/admin/kitchen" className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center hover:border-zinc-700 transition-colors">
            <NavIcon name="kitchen" className="mx-auto text-zinc-400 mb-1" />
            <p className="text-xs font-medium text-zinc-300">Cuisine</p>
          </Link>
          <Link href="/admin/orders" className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center hover:border-zinc-700 transition-colors">
            <NavIcon name="orders" className="mx-auto text-zinc-400 mb-1" />
            <p className="text-xs font-medium text-zinc-300">Commandes</p>
          </Link>
          <Link href="/admin/analytics" className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center hover:border-zinc-700 transition-colors">
            <NavIcon name="analytics" className="mx-auto text-zinc-400 mb-1" />
            <p className="text-xs font-medium text-zinc-300">Analytics</p>
          </Link>
        </div>
      </div>

      {/* Multi-site comparison (only for franchisor viewing all sites) */}
      {isAllSites && locations.length > 1 && (
        <div>
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Comparaison des sites</h2>
          <div className="space-y-2">
            {locations.map((loc) => {
              const siteOrders = orders.filter((o: any) => o.locationId === loc.id);
              const siteTodayOrders = siteOrders.filter((o: any) => o.createdAt?.slice(0, 10) === today);
              const siteRevenue = siteTodayOrders.reduce((s: number, o: any) => s + o.total, 0);
              const siteActive = siteOrders.filter((o: any) => ['received', 'preparing', 'ready'].includes(o.status)).length;
              return (
                <div key={loc.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
                  <div>
                    <p className="text-sm font-semibold text-white">{loc.name}</p>
                    <p className="text-xs text-zinc-500">{siteTodayOrders.length} commandes aujourd&apos;hui</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">{formatPrice(siteRevenue)} €</p>
                    {siteActive > 0 && (
                      <p className="text-[10px] text-emerald-400">{siteActive} en cours</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Latest orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t.ui.admin_latestOrders}</h2>
          <Link href="/admin/orders" className="text-xs text-amber-400">{t.ui.admin_seeAll}</Link>
        </div>
        <div className="space-y-2">
          {orders.slice(0, 5).map((o) => (
            <Link key={o.id} href={`/admin/orders/detail?id=${o.id}`}
              className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{o.orderNumber || o.id}</p>
                <p className="text-xs text-zinc-500">{o.customerName || '—'} — {o.type === 'pickup' ? '🏪' : '🛵'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-amber-400">{formatPrice(o.total)} €</p>
                <p className="text-xs text-zinc-500">{t.ui[`status_${o.status}`] || o.status}</p>
              </div>
            </Link>
          ))}
          {orders.length === 0 && (
            <p className="text-center text-zinc-500 py-8 text-sm">Aucune commande pour le moment</p>
          )}
        </div>
      </div>
    </div>
  );
}
