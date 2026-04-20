'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const NAV = [
  { href: '/admin/platform', label: 'Vue d\'ensemble', exact: true },
  { href: '/admin/platform/clients', label: 'Clients', exact: false },
  { href: '/admin/platform/revenue', label: 'Revenue', exact: false },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Only platform_super_admin can access this layout
  if (user && user.role !== 'platform_super_admin') {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-[#1A1A1A] mb-2">Acces refuse</p>
          <p className="text-sm text-[#8A8A8A]">Cette section est reservee a l&apos;administration de la plateforme.</p>
          <Link href="/admin" className="inline-block mt-6 text-sm text-[#7C3AED] font-medium hover:underline">Retour au dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E2DC]">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/admin/platform" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brizo-icon.svg" alt="BrizoApp" className="h-7 w-7" />
              <span className="text-[14px] font-semibold text-[#1A1A1A] tracking-tight">Brizo</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#7C3AED] text-white">ADMIN</span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                      active ? 'bg-[#F5F3EF] text-[#1A1A1A]' : 'text-[#8A8A8A] hover:text-[#1A1A1A]'
                    }`}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-[#B0ADA6]">{user?.email}</span>
            <button onClick={() => logout()} className="text-[12px] text-[#B0ADA6] hover:text-[#1A1A1A] transition-colors">
              Deconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
