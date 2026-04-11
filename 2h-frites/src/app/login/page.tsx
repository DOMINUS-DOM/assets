'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import Link from 'next/link';

export default function LoginPage() {
  const { login, isAuthenticated, loaded, hasRole, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (loaded && isAuthenticated && user) {
      const adminRoles = ['patron', 'manager', 'employe', 'franchisor_admin', 'location_manager'];
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

  const ic = 'w-full px-4 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">🍟</span>
          <h1 className="text-2xl font-extrabold text-white">{t.ui.auth_login}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input className={ic} type="email" placeholder={t.ui.auth_email} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={ic} type="password" placeholder={t.ui.auth_password} value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold text-sm active:scale-[0.97] transition-transform">
            {t.ui.auth_loginBtn}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link href="/register" className="text-amber-400 text-sm font-medium">{t.ui.auth_noAccount}</Link>
          <br />
          <Link href="/forgot-password" className="text-zinc-500 text-xs">{t.ui.auth_forgotPassword}</Link>
        </div>
      </div>
    </div>
  );
}
