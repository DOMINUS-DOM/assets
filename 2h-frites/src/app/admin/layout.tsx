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
  permission?: string; // permission key from permissions.ts
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function LocationSelector() {
  const { locationId, locations, setLocationId, canSwitch } = useLocation();
  const { t } = useLanguage();
  if (!canSwitch || locations.length === 0) return null;

  return (
    <select
      value={locationId || 'all'}
      onChange={(e) => setLocationId(e.target.value === 'all' ? null : e.target.value)}
      className="w-full px-2.5 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-500/50"
    >
      <option value="all">{t.ui.nav_allSites}</option>
      {locations.map((l) => (
        <option key={l.id} value={l.id}>{l.name}{!l.active ? ' (inactif)' : ''}</option>
      ))}
    </select>
  );
}

function AdminContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { hasRole, hasPermission } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navGroups: NavGroup[] = [
    {
      title: t.ui.nav_principal,
      items: [
        { href: '/admin', label: t.ui.admin_dashboard, icon: 'dashboard', exact: true, roles: ['patron', 'manager', 'employe', 'franchisor_admin', 'location_manager'], permission: 'dashboard' },
        { href: '/admin/locations', label: t.ui.loc_nav, icon: 'locations', exact: false, roles: ['franchisor_admin'], permission: 'locations' },
      ],
    },
    {
      title: t.ui.nav_commandes,
      items: [
        { href: '/admin/orders', label: t.ui.admin_orders, icon: 'orders', exact: false, roles: ['patron', 'manager', 'employe', 'franchisor_admin'], permission: 'orders' },
        { href: '/admin/kitchen', label: t.ui.kds_nav, icon: 'kitchen', exact: false, roles: ['patron', 'manager', 'employe', 'franchisor_admin'], permission: 'kitchen' },
        { href: '/admin/reservations', label: t.ui.nav_reservations, icon: 'orders', exact: false, roles: ['patron', 'manager', 'franchisor_admin', 'location_manager'], permission: 'reservations' },
      ],
    },
    {
      title: t.ui.nav_catalogue,
      items: [
        { href: '/admin/menu', label: t.ui.cms_nav, icon: 'menu', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'menu' },
        { href: '/admin/zones', label: t.ui.zone_nav, icon: 'zones', exact: false, roles: ['patron', 'manager', 'franchisor_admin', 'location_manager'], permission: 'zones' },
        { href: '/admin/tables', label: t.ui.nav_salle, icon: 'menu', exact: false, roles: ['patron', 'manager', 'employe', 'franchisor_admin', 'location_manager'], permission: 'tables' },
        { href: '/admin/inventory', label: t.ui.inv_nav, icon: 'inventory', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'inventory' },
        { href: '/admin/recipes', label: t.ui.nav_recettes, icon: 'menu', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'recipes' },
      ],
    },
    {
      title: t.ui.nav_equipe,
      items: [
        { href: '/admin/staff', label: t.ui.staff_title, icon: 'staff', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'staff' },
        { href: '/admin/drivers', label: t.ui.admin_drivers, icon: 'drivers', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'drivers' },
        { href: '/admin/recruitment', label: t.ui.admin_recruitment, icon: 'recruitment', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'recruitment' },
        { href: '/admin/payroll', label: t.ui.admin_payroll, icon: 'payroll', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'payroll' },
        { href: '/admin/users', label: t.ui.nav_utilisateurs, icon: 'users', exact: false, roles: ['patron', 'franchisor_admin', 'franchisee_owner'], permission: 'users' },
      ],
    },
    {
      title: t.ui.nav_business,
      items: [
        { href: '/admin/payments', label: t.ui.pmt_nav, icon: 'payments', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'payments' },
        { href: '/admin/crm', label: t.ui.crm_nav, icon: 'crm', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'crm' },
        { href: '/admin/analytics', label: t.ui.ana_nav, icon: 'analytics', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'analytics' },
        { href: '/admin/forecast', label: t.ui.fc_nav, icon: 'forecast', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'forecast' },
        { href: '/admin/channels', label: t.ui.ch_nav, icon: 'channels', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'channels' },
        { href: '/admin/reviews', label: t.ui.rev_nav, icon: 'reviews', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'reviews' },
        { href: '/admin/reports', label: t.ui.nav_rapportPL, icon: 'payroll', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'analytics' },
        { href: '/admin/invoices', label: t.ui.nav_facturesAchat, icon: 'payments', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'invoices' },
        { href: '/admin/dashboard-finance', label: t.ui.nav_finances, icon: 'forecast', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'analytics' },
      ],
    },
    {
      title: t.ui.nav_outils,
      items: [
        { href: '/admin/signage', label: t.ui.nav_affichage, icon: 'signage', exact: false, roles: ['patron', 'manager', 'franchisor_admin', 'location_manager'], permission: 'signage' },
        { href: '/admin/qrcode', label: t.ui.nav_qrcodes, icon: 'channels', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'qrcode' },
        { href: '/admin/audit', label: t.ui.nav_audit, icon: 'orders', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'settings' },
        { href: '/admin/settings', label: t.ui.set_nav, icon: 'settings', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'settings' },
      ],
    },
  ];

  // Filter by permission (with role fallback)
  const filteredGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((n) => {
        // If user has custom permissions, use permission-based check
        if (n.permission && hasPermission(n.permission)) return true;
        // Fallback: legacy role check (ensures backward compat)
        return hasRole(...(n.roles as any));
      }),
    }))
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
            <p className="text-[10px] text-zinc-500">{t.ui.nav_subtitle}</p>
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
        <Link href="/pos" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors font-medium">
          <NavIcon name="payments" />
          <span>{t.ui.pos_title}</span>
        </Link>
        <Link href="/" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-colors">
          <NavIcon name="store" />
          <span>{t.ui.admin_clientMenu}</span>
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex">
      {/* Sidebar — desktop (fixed) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 xl:w-60 bg-white dark:bg-zinc-900/50 border-r border-gray-200 dark:border-zinc-800/50 fixed inset-y-0 left-0 z-30">
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
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800/50">
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
