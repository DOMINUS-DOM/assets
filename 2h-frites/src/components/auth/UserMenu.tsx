'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import Link from 'next/link';

const ROLE_COLORS: Record<string, string> = {
  patron: 'bg-amber-500/20 text-amber-400',
  manager: 'bg-blue-500/20 text-blue-400',
  employe: 'bg-emerald-500/20 text-emerald-400',
  livreur: 'bg-orange-500/20 text-orange-400',
  client: 'bg-zinc-700/50 text-zinc-300',
  franchisor_admin: 'bg-purple-500/20 text-purple-400',
  location_manager: 'bg-cyan-500/20 text-cyan-400',
  franchisee_owner: 'bg-rose-500/20 text-rose-400',
};

const ADMIN_ROLES = ['patron', 'manager', 'employe', 'franchisor_admin', 'location_manager'];
const STAFF_ROLES = ['patron', 'manager', 'employe', 'livreur', 'franchisor_admin', 'location_manager'];
const DRIVER_ROLES = ['livreur'];

export default function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <Link href="/login"
        className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium hover:bg-amber-500/25 transition-colors">
        {t.ui.auth_login}
      </Link>
    );
  }

  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 font-bold text-sm flex items-center justify-center active:scale-95 transition-transform">
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden animate-scale-in">
          <div className="px-4 py-3 border-b border-zinc-700">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-zinc-400 truncate">{user.email}</p>
            <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${ROLE_COLORS[user.role]}`}>
              {t.ui[`role_${user.role}`]}
            </span>
          </div>
          <div className="py-1">
            <Link href="/profile" onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
              {t.ui.auth_profile}
            </Link>
            {STAFF_ROLES.includes(user.role) && (
              <Link href="/staff" onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
                {t.ui.staff_portal}
              </Link>
            )}
            {ADMIN_ROLES.includes(user.role) && (
              <Link href="/admin" onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
                Admin
              </Link>
            )}
            {DRIVER_ROLES.includes(user.role) && (
              <Link href="/driver" onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
                {t.ui.driver_title}
              </Link>
            )}
          </div>
          <div className="border-t border-zinc-700 py-1">
            <button onClick={() => { logout(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-700 transition-colors">
              {t.ui.auth_logout}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
