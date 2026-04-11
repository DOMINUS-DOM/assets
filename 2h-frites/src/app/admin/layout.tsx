'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import UserMenu from '@/components/auth/UserMenu';
import NotificationBell from '@/components/NotificationBell';
import { useLocation } from '@/contexts/LocationContext';
import NavIcon from '@/components/admin/NavIcon';

// ─── Nav groups ───
interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact: boolean;
  roles: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function LocationSelector() {
  const { locationId, locations, setLocationId, canSwitch } = useLocation();
  if (!canSwitch || locations.length === 0) return null;

  return (
    <select
      value={locationId || 'all'}
      onChange={(e) => setLocationId(e.target.value === 'all' ? null : e.target.value)}
      className="w-full px-2.5 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-500/50"
    >
      <option value="all">Tous les sites</option>
      {locations.map((l) => (
        <option key={l.id} value={l.id}>{l.name}{!l.active ? ' (inactif)' : ''}</option>
      ))}
    </select>
  );
}

function AdminContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { hasRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navGroups: NavGroup[] = [
    {
      title: 'Principal',
      items: [
        { href: '/admin', label: t.ui.admin_dashboard, icon: 'dashboard', exact: true, roles: ['patron', 'manager', 'employe', 'franchisor_admin', 'location_manager'] },
        { href: '/admin/locations', label: t.ui.loc_nav, icon: 'locations', exact: false, roles: ['franchisor_admin'] },
      ],
    },
    {
      title: 'Commandes',
      items: [
        { href: '/admin/orders', label: t.ui.admin_orders, icon: 'orders', exact: false, roles: ['patron', 'manager', 'employe', 'franchisor_admin'] },
        { href: '/admin/kitchen', label: t.ui.kds_nav, icon: 'kitchen', exact: false, roles: ['patron', 'manager', 'employe', 'franchisor_admin'] },
      ],
    },
    {
      title: 'Catalogue',
      items: [
        { href: '/admin/menu', label: t.ui.cms_nav, icon: 'menu', exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
        { href: '/admin/zones', label: t.ui.zone_nav, icon: 'zones', exact: false, roles: ['patron', 'manager', 'franchisor_admin', 'location_manager'] },
        { href: '/admin/inventory', label: t.ui.inv_nav, icon: 'inventory', exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
      ],
    },
    {
      title: 'Equipe',
      items: [
        { href: '/admin/staff', label: t.ui.staff_title, icon: 'staff', exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
        { href: '/admin/drivers', label: t.ui.admin_drivers, icon: 'drivers', exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
        { href: '/admin/recruitment', label: t.ui.admin_recruitment, icon: 'recruitment', exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
        { href: '/admin/payroll', label: t.ui.admin_payroll, icon: 'payroll', exact: false, roles: ['patron', 'franchisor_admin'] },
      ],
    },
    {
      title: 'Business',
      items: [
        { href: '/admin/payments', label: t.ui.pmt_nav, icon: 'payments', exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
        { href: '/admin/crm', label: t.ui.crm_nav, icon: 'crm', exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
        { href: '/admin/analytics', label: t.ui.ana_nav, icon: 'analytics', exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
        { href: '/admin/forecast', label: t.ui.fc_nav, icon: 'forecast', exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
        { href: '/admin/channels', label: t.ui.ch_nav, icon: 'channels', exact: false, roles: ['patron', 'franchisor_admin'] },
        { href: '/admin/reviews', label: t.ui.rev_nav, icon: 'reviews', exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
      ],
    },
    {
      title: 'Outils',
      items: [
        { href: '/admin/signage', label: 'Affichage', icon: 'signage', exact: false, roles: ['patron', 'manager', 'franchisor_admin', 'location_manager'] },
        { href: '/admin/settings', label: t.ui.set_nav, icon: 'settings', exact: false, roles: ['patron', 'franchisor_admin'] },
      ],
    },
  ];

  // Filter by role
  const filteredGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((n) => hasRole(...(n.roles as any))) }))
    .filter((g) => g.items.length > 0);

  const sidebar = (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-zinc-800/50">
        <Link href="/admin" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="2H" className="h-8 w-8 object-contain" />
          <div>
            <p className="font-bold text-sm text-white">2H Admin</p>
            <p className="text-[10px] text-zinc-500">Gestion du restaurant</p>
          </div>
        </Link>
      </div>

      {/* Location selector */}
      <div className="px-3 py-3 border-b border-zinc-800/50">
        <LocationSelector />
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {filteredGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">{group.title}</p>
            {group.items.map((n) => {
              const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                    active
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}>
                  <NavIcon name={n.icon} />
                  <span className="truncate">{n.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom links */}
      <div className="px-3 py-3 border-t border-zinc-800/50 space-y-1">
        <Link href="/" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-colors">
          <NavIcon name="store" />
          <span>{t.ui.admin_clientMenu}</span>
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-zinc-950 dark:bg-zinc-950 bg-gray-50 flex">
      {/* Sidebar — desktop (fixed) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 xl:w-60 dark:bg-zinc-900/50 bg-white border-r dark:border-zinc-800/50 border-gray-200 fixed inset-y-0 left-0 z-30">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-zinc-900 border-r border-zinc-800 shadow-2xl">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-56 xl:ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 dark:bg-zinc-950/95 bg-white/95 backdrop-blur-md border-b dark:border-zinc-800/50 border-gray-200">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button onClick={() => setMobileOpen(true)} className="lg:hidden text-zinc-400 hover:text-white p-1">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {/* Breadcrumb */}
              <div className="hidden sm:block">
                {pathname !== '/admin' && (
                  <p className="text-xs text-zinc-500">
                    {filteredGroups.flatMap((g) => g.items).find((n) => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label || ''}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile location selector */}
              <div className="lg:hidden">
                <LocationSelector />
              </div>
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['patron', 'manager', 'employe', 'franchisor_admin', 'franchisee_owner', 'location_manager']}>
      <AdminContent>{children}</AdminContent>
    </ProtectedRoute>
  );
}
