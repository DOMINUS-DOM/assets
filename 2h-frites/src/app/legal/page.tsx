'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import Link from 'next/link';

type Tab = 'terms' | 'privacy' | 'cookies';

export default function LegalPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('terms');
  const [biz, setBiz] = useState<any>({ name: 'Restaurant', address: '', phone: '', email: '', vatNumber: '' });

  useEffect(() => { api.get<any>('/settings').then(setBiz).catch(() => {}); }, []);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'terms', label: t.ui.legal_terms },
    { key: 'privacy', label: t.ui.legal_privacy },
    { key: 'cookies', label: t.ui.legal_cookies },
  ];

  const section = (title: string, content: string) => (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-zinc-400 leading-relaxed">{content}</p>
    </div>
  );

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="text-amber-400 font-medium text-sm">← Menu</Link>
          <h1 className="text-sm font-bold text-white">{t.ui.legal_title}</h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="flex gap-1.5 mb-6">
          {TABS.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === tb.key ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* CGV */}
        {tab === 'terms' && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">{t.ui.legal_termsTitle}</h2>
            {section(t.ui.legal_t1_title, t.ui.legal_t1_content.replace('{name}', biz.name).replace('{address}', biz.address).replace('{vat}', biz.vatNumber))}
            {section(t.ui.legal_t2_title, t.ui.legal_t2_content)}
            {section(t.ui.legal_t3_title, t.ui.legal_t3_content)}
            {section(t.ui.legal_t4_title, t.ui.legal_t4_content)}
            {section(t.ui.legal_t5_title, t.ui.legal_t5_content)}
          </div>
        )}

        {/* Privacy */}
        {tab === 'privacy' && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">{t.ui.legal_privacyTitle}</h2>
            {section(t.ui.legal_p1_title, t.ui.legal_p1_content.replace('{name}', biz.name))}
            {section(t.ui.legal_p2_title, t.ui.legal_p2_content)}
            {section(t.ui.legal_p3_title, t.ui.legal_p3_content)}
            {section(t.ui.legal_p4_title, t.ui.legal_p4_content.replace('{email}', biz.email))}
          </div>
        )}

        {/* Cookies */}
        {tab === 'cookies' && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">{t.ui.legal_cookiesTitle}</h2>
            {section(t.ui.legal_c1_title, t.ui.legal_c1_content)}
            {section(t.ui.legal_c2_title, t.ui.legal_c2_content)}
          </div>
        )}

        <div className="mt-8 p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-xs text-zinc-500 space-y-1">
          <p className="font-medium text-zinc-400">{biz.name}</p>
          <p>{biz.address}</p>
          <p>{biz.phone} — {biz.email}</p>
          <p>TVA: {biz.vatNumber}</p>
        </div>
      </div>
    </div>
  );
}
