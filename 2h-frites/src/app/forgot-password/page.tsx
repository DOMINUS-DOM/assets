'use client';

import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth', { action: 'forgotPassword', email });
    } catch {
      // Server always returns 200 for this action; swallow transient errors.
    }
    // Always show the "check your email" confirmation — never reveal whether the address exists.
    setSent(true);
    setLoading(false);
  };

  const ic = 'w-full px-4 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-brand/50';

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <span className="text-5xl block mb-3">🔑</span>
        <h1 className="text-xl font-bold text-white mb-6">{t.ui.auth_forgotPassword}</h1>

        {sent ? (
          <div className="animate-scale-in">
            <span className="text-4xl block mb-3">📧</span>
            <p className="text-zinc-400 text-sm mb-2">
              Si un compte existe pour cette adresse, un email avec un lien de réinitialisation vient d&apos;être envoyé. Le lien est valable 1 heure.
            </p>
            <p className="text-zinc-500 text-xs mb-4">Pensez à vérifier vos spams.</p>
            <Link href="/login" className="text-brand-light text-sm font-medium">{t.ui.auth_login}</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input className={ic} type="email" placeholder={t.ui.auth_email} value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl bg-brand text-zinc-950 font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-50">
              {loading ? '…' : t.ui.auth_resetPassword}
            </button>
            <Link href="/login" className="text-zinc-500 text-xs block mt-4">{t.ui.auth_login}</Link>
          </form>
        )}
      </div>
    </div>
  );
}
