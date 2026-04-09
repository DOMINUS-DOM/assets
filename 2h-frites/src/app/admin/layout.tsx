'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin', label: '📊 Dashboard', exact: true },
  { href: '/admin/orders', label: '📋 Commandes', exact: false },
  { href: '/admin/drivers', label: '🛵 Livreurs', exact: false },
  { href: '/admin/recruitment', label: '📝 Candidatures', exact: false },
  { href: '/admin/payroll', label: '💰 Paye', exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4 max-w-4xl mx-auto">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-lg">🍟</span>
            <span className="font-bold text-sm"><span className="text-amber-400">2H</span> Admin</span>
          </Link>
          <Link href="/" className="text-xs text-zinc-500 hover:text-amber-400 transition-colors">← Menu client</Link>
        </div>
        <nav className="overflow-x-auto px-4 max-w-4xl mx-auto">
          <div className="flex gap-1 pb-2">
            {NAV.map((n) => {
              const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active ? 'bg-amber-500/15 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
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
