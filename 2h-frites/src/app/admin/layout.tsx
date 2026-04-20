'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import UserMenu from '@/components/auth/UserMenu';
import NotificationBell from '@/components/NotificationBell';
import TrialBanner from '@/components/TrialBanner';
import TrialExpiredGate from '@/components/TrialExpiredGate';
import { useTenant } from '@/contexts/TenantContext';
import { useLocation } from '@/contexts/LocationContext';
import NavIcon from '@/components/admin/NavIcon';

// ─── Nav groups ───
interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact: boolean;
  roles: string[];
  permission?: string;             // permission key from permissions.ts
  module?: string;                  // tenant module key — hidden if module disabled
  badge?: 'beta' | 'preview';       // small inline tag shown next to the label
  simple?: boolean;                 // visible in the default "simple" mode
                                     // (others only appear when user toggles
                                     // "Voir plus d'options")
}

interface NavGroup {
  key: string;                      // used for the collapse persistence key
  title: string;
  items: NavItem[];
  collapsible: boolean;             // false = always open (Essentiel)
  defaultOpen: boolean;             // initial state for collapsible groups
}

function LocationSelector() {
  const { locationId, locations, setLocationId, canSwitch } = useLocation();
  const { t } = useLanguage();
  if (!canSwitch || locations.length === 0) return null;

  return (
    <select
      value={locationId || 'all'}
      onChange={(e) => setLocationId(e.target.value === 'all' ? null : e.target.value)}
      className="w-full px-2.5 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-brand/50"
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
  const router = useRouter();
  const { t } = useLanguage();
  const { hasRole, hasPermission } = useAuth();
  const { tenant } = useTenant();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Redirect fresh tenants to the 3-step wizard at /admin/welcome. The flag
  // is set on Organization.onboarded — backfilled to `true` for all existing
  // tenants so only brand-new signups land here.
  useEffect(() => {
    if (!tenant) return;
    if (tenant.onboarded === false && pathname !== '/admin/welcome') {
      router.replace('/admin/welcome');
    }
  }, [tenant, pathname, router]);

  // 5-group taxonomy — ordered by daily frequency. Essentiel covers ~80% of
  // daily ops and is always expanded. Later groups are collapsible so the
  // sidebar never feels like an ERP to a new restaurateur.
  const navGroups: NavGroup[] = [
    {
      key: 'essentiel',
      title: 'Essentiel',
      collapsible: false,
      defaultOpen: true,
      items: [
        { href: '/admin', label: t.ui.admin_dashboard, icon: 'dashboard', exact: true, roles: ['patron', 'manager', 'employe', 'franchisor_admin', 'location_manager'], permission: 'dashboard', simple: true },
        { href: '/admin/orders', label: t.ui.admin_orders, icon: 'orders', exact: false, roles: ['patron', 'manager', 'employe', 'franchisor_admin'], permission: 'orders', simple: true },
        { href: '/admin/menu', label: t.ui.cms_nav, icon: 'menu', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'menu', simple: true },
        { href: '/admin/payments', label: t.ui.pmt_nav, icon: 'payments', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'payments', simple: true },
        { href: '/admin/settings', label: t.ui.set_nav, icon: 'settings', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'settings', simple: true },
      ],
    },
    {
      key: 'operations',
      title: 'Opérations',
      collapsible: true,
      defaultOpen: true,
      items: [
        { href: '/admin/kitchen', label: t.ui.kds_nav, icon: 'kitchen', exact: false, roles: ['patron', 'manager', 'employe', 'franchisor_admin'], permission: 'kitchen', module: 'kds', simple: true },
        { href: '/admin/tables', label: t.ui.nav_salle, icon: 'menu', exact: false, roles: ['patron', 'manager', 'employe', 'franchisor_admin', 'location_manager'], permission: 'tables', simple: true },
        { href: '/admin/reservations', label: t.ui.nav_reservations, icon: 'orders', exact: false, roles: ['patron', 'manager', 'franchisor_admin', 'location_manager'], permission: 'reservations', module: 'reservations', badge: 'beta', simple: true },
        { href: '/admin/zones', label: t.ui.zone_nav, icon: 'zones', exact: false, roles: ['patron', 'manager', 'franchisor_admin', 'location_manager'], permission: 'zones' },
        { href: '/admin/inventory', label: t.ui.inv_nav, icon: 'inventory', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'inventory', module: 'inventory' },
        { href: '/admin/recipes', label: t.ui.nav_recettes, icon: 'menu', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'recipes', module: 'recipes' },
      ],
    },
    {
      key: 'equipe',
      title: 'Équipe',
      collapsible: true,
      defaultOpen: false,
      items: [
        { href: '/admin/staff', label: t.ui.staff_title, icon: 'staff', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'staff' },
        { href: '/admin/drivers', label: t.ui.admin_drivers, icon: 'drivers', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'drivers', module: 'delivery' },
        { href: '/admin/recruitment', label: t.ui.admin_recruitment, icon: 'recruitment', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'recruitment' },
        { href: '/admin/payroll', label: t.ui.admin_payroll, icon: 'payroll', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'payroll', module: 'payroll' },
        { href: '/admin/users', label: t.ui.nav_utilisateurs, icon: 'users', exact: false, roles: ['patron', 'franchisor_admin', 'franchisee_owner'], permission: 'users' },
      ],
    },
    {
      key: 'business',
      title: 'Business / Croissance',
      collapsible: true,
      defaultOpen: false,
      items: [
        { href: '/admin/crm', label: t.ui.crm_nav, icon: 'crm', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'crm', module: 'crm' },
        { href: '/admin/analytics', label: t.ui.ana_nav, icon: 'analytics', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'analytics', module: 'analytics' },
        { href: '/admin/reports', label: t.ui.nav_rapportPL, icon: 'payroll', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'analytics' },
        { href: '/admin/forecast', label: t.ui.fc_nav, icon: 'forecast', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'forecast', module: 'analytics', badge: 'preview' },
        { href: '/admin/channels', label: t.ui.ch_nav, icon: 'channels', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'channels' },
        { href: '/admin/reviews', label: t.ui.rev_nav, icon: 'reviews', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'reviews' },
        { href: '/admin/qrcode', label: t.ui.nav_qrcodes, icon: 'channels', exact: false, roles: ['patron', 'manager', 'franchisor_admin'], permission: 'qrcode' },
        { href: '/admin/signage', label: t.ui.nav_affichage, icon: 'signage', exact: false, roles: ['patron', 'manager', 'franchisor_admin', 'location_manager'], permission: 'signage', module: 'signage' },
      ],
    },
    {
      key: 'avance',
      title: 'Paramètres avancés',
      collapsible: true,
      defaultOpen: false,
      items: [
        { href: '/admin/audit', label: t.ui.nav_audit, icon: 'orders', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'settings' },
        { href: '/admin/billing', label: 'Abonnement', icon: 'payments', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'settings' },
        { href: '/admin/locations', label: 'Multi-sites', icon: 'store', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'settings' },
        { href: '/admin/invoices', label: t.ui.nav_facturesAchat, icon: 'payments', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'invoices' },
        { href: '/admin/dashboard-finance', label: t.ui.nav_finances, icon: 'forecast', exact: false, roles: ['patron', 'franchisor_admin'], permission: 'analytics' },
      ],
    },
  ];

  // Module check helper (reads from tenant context)
  const isModuleEnabled = (mod: string): boolean => {
    if (!tenant?.modules) return true; // default: all enabled
    return (tenant.modules as any)[mod] !== false;
  };

  // Progressive-disclosure mode. Simple = default restaurateur view with a
  // curated subset (Essentiel + top Opérations). Advanced = the full sidebar.
  // Persisted so a power user doesn't get reset every reload.
  const [advancedMode, setAdvancedMode] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem('brizo-admin-advanced') === '1') setAdvancedMode(true);
    } catch { /* noop */ }
  }, []);
  const toggleAdvanced = () => {
    setAdvancedMode((prev) => {
      const next = !prev;
      try { localStorage.setItem('brizo-admin-advanced', next ? '1' : '0'); } catch { /* noop */ }
      return next;
    });
  };

  // Filter by module + permission (with role fallback), then by simple/advanced
  // mode. Items without `simple: true` only appear when advanced mode is on.
  const filteredGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((n) => {
        if (n.module && !isModuleEnabled(n.module)) return false;
        if (hasRole('platform_super_admin')) return false;
        if (!advancedMode && !n.simple) return false;
        if (n.permission && hasPermission(n.permission)) return true;
        return hasRole(...(n.roles as any));
      }),
    }))
    .filter((g) => g.items.length > 0);

  // Collapsed-group state, persisted per-user so sidebar scroll remembers the
  // last layout. `false` = open, `true` = collapsed. Non-collapsible groups
  // (Essentiel) are always open regardless.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem('brizo-admin-nav-collapsed');
      if (raw) setCollapsed(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);
  const toggleGroup = (key: string) => {
    const group = navGroups.find((g) => g.key === key);
    if (!group) return;
    setCollapsed((prev) => {
      // Resolve "currently closed" from the stored override OR the default.
      // Without this, a group whose default is closed would flip to closed
      // again on first click (because `prev[key]` is undefined → `!undefined`).
      const currentlyClosed = prev[key] !== undefined ? prev[key] : !group.defaultOpen;
      const next = { ...prev, [key]: !currentlyClosed };
      try { localStorage.setItem('brizo-admin-nav-collapsed', JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };
  const isOpen = (g: NavGroup) => {
    if (!g.collapsible) return true;
    if (collapsed[g.key] !== undefined) return !collapsed[g.key];
    return g.defaultOpen;
  };

  const sidebar = (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-zinc-800/50">
        <Link href="/admin" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          {tenant?.branding?.faviconUrl || tenant?.branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.branding.faviconUrl || tenant.branding.logoUrl} alt={tenant.branding.brandName || tenant.name || 'Restaurant'} className="h-8 w-8 object-contain" />
          ) : null}
          <div>
            <p className="font-bold text-sm text-white truncate max-w-[12rem]">{tenant?.branding?.brandName || tenant?.name || 'Restaurant'} Admin</p>
            <p className="text-[10px] text-zinc-500">{t.ui.nav_subtitle}</p>
          </div>
        </Link>
      </div>

      {/* Location selector */}
      <div className="px-3 py-3 border-b border-zinc-800/50">
        <LocationSelector />
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
        {filteredGroups.map((group) => {
          const open = isOpen(group);
          const header = (
            <div className="flex items-center gap-1 px-3 py-1.5">
              <span className="flex-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{group.title}</span>
              {group.collapsible && (
                <svg
                  className={`w-3 h-3 text-zinc-600 transition-transform ${open ? 'rotate-90' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          );
          return (
            <div key={group.key}>
              {group.collapsible ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className="w-full text-left rounded-md hover:bg-zinc-800/40 transition-colors"
                  aria-expanded={open}
                >
                  {header}
                </button>
              ) : header}
              {open && (
                <div className="mt-0.5">
                  {group.items.map((n) => {
                    const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
                    return (
                      <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                          active
                            ? 'bg-brand/15 text-brand-light'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                        }`}>
                        <NavIcon name={n.icon} />
                        <span className="flex-1 truncate">{n.label}</span>
                        {n.badge === 'beta' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400">Beta</span>
                        )}
                        {n.badge === 'preview' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-blue-500/15 text-blue-400">Preview</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progressive disclosure toggle — sits above the quick launch so it's
          the last sidebar item a user scans. */}
      <div className="px-3 pt-3 border-t border-zinc-800/50">
        <button
          type="button"
          onClick={toggleAdvanced}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-colors"
        >
          <span>{advancedMode ? 'Mode simple' : "Voir plus d'options"}</span>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
            {advancedMode ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 15l-7-7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 9l7 7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Bottom links */}
      <div className="px-3 py-3 space-y-1">
        <Link href="/pos" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-brand-light hover:text-amber-300 hover:bg-brand/10 transition-colors font-medium">
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
    <div className="dark min-h-screen bg-gray-50 dark:bg-zinc-950 text-white flex">
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
        {/* Trial banner */}
        <TrialBanner />

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

        {/* Page content — gated by trial paywall */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-6xl">
          <TrialExpiredGate>{children}</TrialExpiredGate>
        </main>
      </div>
    </div>
  );
}

function PlatformBypass({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Platform routes have their own layout — bypass the tenant admin shell
  if (pathname.startsWith('/admin/platform')) {
    return <>{children}</>;
  }

  return <AdminContent>{children}</AdminContent>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['platform_super_admin', 'patron', 'manager', 'employe', 'franchisor_admin', 'franchisee_owner', 'location_manager']}>
      <PlatformBypass>{children}</PlatformBypass>
    </ProtectedRoute>
  );
}
