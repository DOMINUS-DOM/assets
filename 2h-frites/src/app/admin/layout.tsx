'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import UserMenu from '@/components/auth/UserMenu';
import NotificationBell from '@/components/NotificationBell';
import { useLocation } from '@/contexts/LocationContext';

function LocationSelector() {
  const { locationId, locations, setLocationId, canSwitch } = useLocation();
  if (!canSwitch || locations.length <= 1) return null;

  return (
    <select
      value={locationId || 'all'}
      onChange={(e) => setLocationId(e.target.value === 'all' ? null : e.target.value)}
      className="px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-500/50"
    >
      <option value="all">Tous les sites</option>
      {locations.filter((l) => l.active).map((l) => (
        <option key={l.id} value={l.id}>{l.name}</option>
      ))}
    </select>
  );
}

function AdminContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { hasRole } = useAuth();

  const NAV = [
    { href: '/admin', label: t.ui.admin_dashboard, exact: true, roles: ['patron', 'manager', 'employe', 'franchisor_admin', 'location_manager'] },
    { href: '/admin/locations', label: t.ui.loc_nav, exact: false, roles: ['franchisor_admin'] },
    { href: '/admin/orders', label: t.ui.admin_orders, exact: false, roles: ['patron', 'manager', 'employe', 'franchisor_admin'] },
    { href: '/admin/kitchen', label: t.ui.kds_nav, exact: false, roles: ['patron', 'manager', 'employe', 'franchisor_admin'] },
    { href: '/admin/menu', label: t.ui.cms_nav, exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
    { href: '/admin/zones', label: t.ui.zone_nav, exact: false, roles: ['patron', 'manager', 'franchisor_admin', 'location_manager'] },
    { href: '/admin/inventory', label: t.ui.inv_nav, exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
    { href: '/admin/crm', label: t.ui.crm_nav, exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
    { href: '/admin/staff', label: t.ui.staff_title, exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
    { href: '/admin/drivers', label: t.ui.admin_drivers, exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
    { href: '/admin/recruitment', label: t.ui.admin_recruitment, exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
    { href: '/admin/payments', label: t.ui.pmt_nav, exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
    { href: '/admin/analytics', label: t.ui.ana_nav, exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
    { href: '/admin/forecast', label: t.ui.fc_nav, exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
    { href: '/admin/channels', label: t.ui.ch_nav, exact: false, roles: ['patron', 'franchisor_admin'] },
    { href: '/admin/reviews', label: t.ui.rev_nav, exact: false, roles: ['patron', 'manager', 'franchisor_admin'] },
    { href: '/admin/payroll', label: t.ui.admin_payroll, exact: false, roles: ['patron', 'franchisor_admin'] },
    { href: '/admin/settings', label: t.ui.set_nav, exact: false, roles: ['patron', 'franchisor_admin'] },
  ];

  const visibleNav = NAV.filter((n) => hasRole(...(n.roles as any)));

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4 max-w-4xl mx-auto">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-lg">🍟</span>
            <span className="font-bold text-sm"><span className="text-amber-400">2H</span> Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <LocationSelector />
            <Link href="/" className="text-xs text-zinc-500 hover:text-amber-400 transition-colors">{t.ui.admin_clientMenu}</Link>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
        <nav className="overflow-x-auto px-4 max-w-4xl mx-auto">
          <div className="flex gap-1 pb-2">
            {visibleNav.map((n) => {
              const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-amber-500/15 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
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
