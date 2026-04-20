'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import Link from 'next/link';

export default function ReferralPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [generated, setGenerated] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemResult, setRedeemResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!user) return;
    try {
      const ref = await api.post<any>('/referrals', { action: 'create', name: user.name, phone: user.phone });
      setCode(ref.code);
      setGenerated(true);
    } catch {}
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/referrals', { action: 'redeem', code: redeemCode, phone: user?.phone || '' });
      setRedeemResult('success');
    } catch {
      setRedeemResult('error');
    }
  };

  const ic = 'w-full px-4 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="text-amber-400 font-medium text-sm">← Menu</Link>
          <h1 className="text-sm font-bold text-white">{t.ui.ref_title}</h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="px-4 pt-6 space-y-8">
        {/* Generate referral code */}
        <div className="text-center">
          <span className="text-5xl block mb-3">🎁</span>
          <h2 className="text-lg font-bold text-white">{t.ui.ref_heading}</h2>
          <p className="text-xs text-zinc-400 mt-2">{t.ui.ref_desc}</p>

          {generated ? (
            <div className="mt-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 animate-scale-in">
              <p className="text-xs text-zinc-400 mb-2">{t.ui.ref_yourCode}</p>
              <p className="text-3xl font-black text-amber-400 tracking-wider">{code}</p>
              <p className="text-xs text-zinc-500 mt-2">{t.ui.ref_share}</p>
            </div>
          ) : (
            <button onClick={handleGenerate}
              className="mt-6 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold text-sm active:scale-95">
              {t.ui.ref_generate}
            </button>
          )}
        </div>

        {/* Redeem a code */}
        <div>
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.ref_redeem}</h3>
          <form onSubmit={handleRedeem} className="flex gap-2">
            <input className={ic} placeholder="XXXXXXXX" value={redeemCode} onChange={(e) => setRedeemCode(e.target.value.toUpperCase())} />
            <button type="submit" className="px-5 py-3.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm shrink-0">✓</button>
          </form>
          {redeemResult === 'success' && <p className="text-emerald-400 text-sm mt-2 text-center">🎉 {t.ui.ref_redeemSuccess}</p>}
          {redeemResult === 'error' && <p className="text-red-400 text-sm mt-2 text-center">{t.ui.ref_redeemError}</p>}
        </div>
      </div>
    </div>
  );
}
