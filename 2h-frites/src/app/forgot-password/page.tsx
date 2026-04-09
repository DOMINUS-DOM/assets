'use client';

import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Demo: just show success (no real email sent)
    setSent(true);
  };

  const ic = 'w-full px-4 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <span className="text-5xl block mb-3">🔑</span>
        <h1 className="text-xl font-bold text-white mb-6">{t.ui.auth_forgotPassword}</h1>

        {sent ? (
          <div className="animate-scale-in">
            <span className="text-4xl block mb-3">📧</span>
            <p className="text-zinc-400 text-sm mb-4">{t.ui.auth_resetSent}</p>
            <Link href="/login" className="text-amber-400 text-sm font-medium">{t.ui.auth_login}</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input className={ic} type="email" placeholder={t.ui.auth_email} value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button type="submit"
              className="w-full py-4 rounded-2xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-[0.97] transition-transform">
              {t.ui.auth_resetPassword}
            </button>
            <Link href="/login" className="text-zinc-500 text-xs block mt-4">{t.ui.auth_login}</Link>
          </form>
        )}
      </div>
    </div>
  );
}
