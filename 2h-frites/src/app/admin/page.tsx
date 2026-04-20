'use client';

import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useApiData } from '@/hooks/useApiData';
import { useLocation } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/utils/format';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NavIcon from '@/components/admin/NavIcon';

function OnboardingChecklist({ productCount }: { productCount: number }) {
  const items = [
    { label: 'Créer votre compte', done: true, href: null as string | null },
    { label: 'Configurer votre menu', done: productCount >= 1, href: '/admin/menu' },
    { label: 'Tester votre caisse', done: false, href: '/pos' },
    { label: 'Personnaliser votre restaurant', done: false, href: '/admin/settings' },
  ];
  const completedCount = items.filter(i => i.done).length;

  return (
    <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white">Démarrez votre restaurant</h2>
        <span className="text-xs text-zinc-500">{completedCount}/{items.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${(completedCount / items.length) * 100}%` }} />
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i}>
            {item.href && !item.done ? (
              <Link href={item.href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/50 transition-colors group">
                <div className="w-5 h-5 rounded-full border-2 border-zinc-600 group-hover:border-brand shrink-0" />
                <span className="text-sm text-white flex-1 group-hover:text-brand transition-colors">{item.label}</span>
                <svg className="w-4 h-4 text-zinc-600 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-500' : 'border-2 border-zinc-600'}`}>
                  {item.done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`text-sm flex-1 ${item.done ? 'text-zinc-500 line-through' : 'text-white'}`}>{item.label}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800">
        <Link href="/admin/welcome" className="text-xs text-brand hover:underline">
          Reprendre l&apos;assistant de démarrage →
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend }: { label: string; value: string | number; icon: string; trend?: string }) {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50">
      <div className="flex items-center justify-between mb-2">
        <NavIcon name={icon} className="text-zinc-500 w-4 h-4" />
        {trend && <span className="text-[10px] text-emerald-400 font-medium">{trend}</span>}
      </div>
      <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { locationId, locationName, locations } = useLocation();
  const { user } = useAuth();
  const router = useRouter();

  // Platform super admin goes to dedicated dashboard
  if (user?.role === 'platform_super_admin') {
    router.replace('/admin/platform');
    return null;
  }
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const { data: orders } = useApiData<any[]>(`/orders${locParam}`, []);
  const { data: staffData, refresh: refreshStaff } = useApiData<{ tasks: any[] }>(`/staff${locParam}`, { tasks: [] });
  const { data: menuCategories } = useApiData<any[]>('/menu/v2?full=1', []);
  const { t } = useLanguage();

  // Onboarding detection — API returns flat array of categories, each with `items` (products)
  const productCount = (Array.isArray(menuCategories) ? menuCategories : []).reduce((sum: number, c: any) => sum + (c.items?.length || 0), 0);
  const isNewRestaurant = orders.length === 0;
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

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
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {t.ui.dash_hello}{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          {locationName} — {new Date().toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Welcome banner — prominently surface /admin/welcome when the setup is incomplete */}
      {(productCount === 0 || orders.length === 0) && (
        <Link
          href="/admin/welcome"
          className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-brand/20 via-brand/10 to-transparent border border-brand/30 hover:border-brand/50 transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-brand-light mb-1">
              Complétez votre démarrage
            </p>
            <p className="text-sm font-bold text-white">
              {productCount === 0
                ? 'Configurez votre menu en 2 minutes avec nos modèles prêts à l\u2019emploi.'
                : 'Lancez votre première commande pour débloquer analytics et rapports.'}
            </p>
          </div>
          <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-brand-light group-hover:text-brand transition-colors">
            Ouvrir l&apos;assistant
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </span>
        </Link>
      )}

      {/* Onboarding checklist — shown when no orders yet */}
      {isNewRestaurant && (
        <OnboardingChecklist productCount={productCount} />
      )}

      {/* KPIs — hidden for new restaurants */}
      {!isNewRestaurant && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard icon="orders" label={t.ui.dash_ordersToday} value={todayOrders.length} />
          <StatCard icon="payroll" label={t.ui.dash_revenueToday} value={`${formatPrice(revenue)} €`} />
          <StatCard icon="analytics" label={t.ui.dash_avgTicket} value={`${formatPrice(avgTicket)} €`} />
          <StatCard icon="kitchen" label={t.ui.dash_inProgress} value={activeOrders.length} />
        </div>
      )}

      {/* Active orders requiring attention */}
      {activeOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{t.ui.dash_activeOrders}</h2>
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

      {/* Tasks widget */}
      {(() => {
        const todayTasks = (staffData.tasks || []).filter((t: any) => t.date === today);
        const pendingTasks = todayTasks.filter((t: any) => !t.completed);
        const completedTasks = todayTasks.filter((t: any) => t.completed);
        const PRIO_DOT: Record<string, string> = { urgent: 'bg-purple-500', high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };

        const handleQuickAdd = async () => {
          if (!quickTaskTitle.trim()) return;
          try {
            await api.post('/staff', {
              action: 'addTask',
              data: { title: quickTaskTitle.trim(), description: '', category: 'other', priority: 'medium', date: today, locationId: locationId || null },
            });
            setQuickTaskTitle('');
            refreshStaff();
          } catch {}
        };

        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                {t.ui.dash_todayTasks}
                {pendingTasks.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{pendingTasks.length}</span>
                )}
              </h2>
              <Link href="/admin/staff" className="text-xs text-amber-400">{t.ui.dash_seeAll}</Link>
            </div>

            {/* Quick add */}
            <form onSubmit={(e) => { e.preventDefault(); handleQuickAdd(); }}
              className="flex gap-2 mb-3">
              <input
                type="text"
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                placeholder={t.ui.dash_addTaskPlaceholder}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
              <button type="submit" disabled={!quickTaskTitle.trim()}
                className="px-3 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm disabled:opacity-30 transition-opacity">+</button>
            </form>

            {/* Pending tasks */}
            {pendingTasks.length > 0 ? (
              <div className="space-y-1.5 mb-2">
                {pendingTasks.slice(0, 5).map((tk: any) => (
                  <div key={tk.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/50">
                    <button
                      onClick={async () => { await api.post('/staff', { action: 'toggleTask', id: tk.id }); refreshStaff(); }}
                      className="w-5 h-5 rounded border-2 border-zinc-600 hover:border-amber-500 shrink-0 transition-colors" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{tk.title}</p>
                      {tk.dueTime && <span className="text-[10px] text-zinc-500">⏰ {tk.dueTime}</span>}
                    </div>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${PRIO_DOT[tk.priority] || PRIO_DOT.medium}`} title={tk.priority} />
                  </div>
                ))}
                {pendingTasks.length > 5 && (
                  <Link href="/admin/staff" className="block text-center text-xs text-zinc-500 py-1">+{pendingTasks.length - 5} {t.ui.dash_moreTasks}</Link>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 py-3 text-center">
                {completedTasks.length > 0 ? `✅ ${completedTasks.length} ${t.ui.dash_tasksCompleted}` : t.ui.dash_noTasksToday}
              </p>
            )}

            {/* Progress bar */}
            {todayTasks.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(completedTasks.length / todayTasks.length) * 100}%` }} />
                </div>
                <span className="text-[10px] text-zinc-500 shrink-0">{completedTasks.length}/{todayTasks.length}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Quick actions — 5 core actions a restaurateur needs daily */}
      <div>
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.dash_quickAccess}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Link href="/pos" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center hover:bg-amber-500/15 transition-colors">
            <NavIcon name="payments" className="mx-auto text-amber-400 mb-1" />
            <p className="text-xs font-bold text-amber-400">{t.ui.dash_posCaisse}</p>
          </Link>
          <Link href="/admin/menu" className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center hover:border-zinc-700 transition-colors">
            <NavIcon name="menu" className="mx-auto text-zinc-400 mb-1" />
            <p className="text-xs font-medium text-zinc-300">Menu</p>
          </Link>
          <Link href="/admin/orders" className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center hover:border-zinc-700 transition-colors">
            <NavIcon name="orders" className="mx-auto text-zinc-400 mb-1" />
            <p className="text-xs font-medium text-zinc-300">{t.ui.dash_orders}</p>
          </Link>
          <Link href="/admin/staff" className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center hover:border-zinc-700 transition-colors">
            <NavIcon name="staff" className="mx-auto text-zinc-400 mb-1" />
            <p className="text-xs font-medium text-zinc-300">Staff</p>
          </Link>
          <Link href="/admin/settings" className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center hover:border-zinc-700 transition-colors">
            <NavIcon name="settings" className="mx-auto text-zinc-400 mb-1" />
            <p className="text-xs font-medium text-zinc-300">Paramètres</p>
          </Link>
        </div>
      </div>

      {/* Multi-site comparison (only for franchisor viewing all sites) */}
      {isAllSites && locations.length > 1 && (
        <div>
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.dash_siteComparison}</h2>
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
                    <p className="text-xs text-zinc-500">{siteTodayOrders.length} {t.ui.dash_ordersHere}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">{formatPrice(siteRevenue)} €</p>
                    {siteActive > 0 && (
                      <p className="text-[10px] text-emerald-400">{siteActive} {t.ui.dash_ongoing}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Latest orders — hidden when empty */}
      {orders.length > 0 && (
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
          </div>
        </div>
      )}
    </div>
  );
}
