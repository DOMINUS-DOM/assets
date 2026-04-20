'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useTenant } from '@/contexts/TenantContext';
import Link from 'next/link';
import BrizoAuthLayout from '@/components/BrizoAuthLayout';

export default function LoginPage() {
  const { login, isAuthenticated, loaded, hasRole, user } = useAuth();
  const { t } = useLanguage();
  const { isPlatform, tenant } = useTenant();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (loaded && isAuthenticated && user) {
      // Force password change if flagged
      if ((user as any).mustChangePassword) {
        router.replace('/change-password');
        return;
      }
      const adminRoles = ['platform_super_admin', 'patron', 'manager', 'employe', 'franchisor_admin', 'location_manager'];
      if (adminRoles.includes(user.role)) router.replace('/admin');
      else if (user.role === 'livreur') router.replace('/driver');
      else router.replace('/');
    }
  }, [loaded, isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const err = await login(email, password);
    if (err) setError(t.ui[err] || err);
  };

  // ─── Platform login (BrizoApp) — split layout ───
  if (isPlatform) {
    const ic = 'w-full px-4 py-3.5 rounded-lg bg-[#FAFAF8] border border-[#E5E2DC] text-[#1A1A1A] text-[14px] placeholder-[#B0ADA6] focus:outline-none focus:border-[#7C3AED]/40 focus:ring-1 focus:ring-[#7C3AED]/10 transition-all';
    return (
      <BrizoAuthLayout>
        <div>
          {/* Logo mobile only */}
          <div className="lg:hidden mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brizo-icon.svg" alt="BrizoApp" className="h-9 w-9 mb-4" />
          </div>

          <h1 className="text-[1.75rem] font-bold text-[#1A1A1A] tracking-tight mb-1">Connexion</h1>
          <p className="text-[14px] text-[#8A8A8A] mb-8">Accedez a votre espace BrizoApp</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-[12px] font-medium text-[#8A8A8A] mb-2 block tracking-wide">EMAIL</label>
              <input className={ic} type="email" placeholder="vous@restaurant.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#8A8A8A] mb-2 block tracking-wide">MOT DE PASSE</label>
              <input className={ic} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-red-500 text-[13px]">{error}</p>}
            <button type="submit"
              className="w-full py-3.5 rounded-lg bg-[#1A1A1A] text-white font-medium text-[14px] hover:bg-[#333] transition-colors active:scale-[0.99]">
              Se connecter
            </button>
          </form>

          <div className="mt-8 flex items-center justify-between">
            <Link href="/signup" className="text-[13px] font-medium text-[#7C3AED] hover:text-[#6D28D9]">Creer un compte</Link>
            <Link href="/forgot-password" className="text-[12px] text-[#B0ADA6] hover:text-[#8A8A8A]">Mot de passe oublie ?</Link>
          </div>
        </div>
      </BrizoAuthLayout>
    );
  }

  // ─── Tenant login (restaurant) ───
  const ic = 'w-full px-4 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-brand/50';

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {tenant?.branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.branding.logoUrl} alt={tenant.branding.brandName || tenant.name} className="h-14 mx-auto mb-4 object-contain" />
          ) : tenant?.name ? (
            <p className="text-lg font-bold text-white mb-3">{tenant.branding?.brandName || tenant.name}</p>
          ) : null}
          <h1 className="text-2xl font-extrabold text-white">{t.ui.auth_login}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input className={ic} type="email" placeholder={t.ui.auth_email} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={ic} type="password" placeholder={t.ui.auth_password} value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand to-orange-500 text-zinc-950 font-bold text-sm active:scale-[0.97] transition-transform">
            {t.ui.auth_loginBtn}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link href="/register" className="text-brand-light text-sm font-medium">{t.ui.auth_noAccount}</Link>
          <br />
          <Link href="/forgot-password" className="text-zinc-500 text-xs">{t.ui.auth_forgotPassword}</Link>
        </div>
      </div>
    </div>
  );
}
