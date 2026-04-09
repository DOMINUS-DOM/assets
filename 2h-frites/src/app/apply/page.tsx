'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import Link from 'next/link';

export default function ApplyPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', transport: '', availability: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.city || !form.transport) return;
    await api.post('/drivers', { action: 'addApplication', data: form });
    setSubmitted(true);
  };

  const ic = 'w-full px-4 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  if (submitted) {
    return (
      <div className="min-h-screen max-w-lg mx-auto flex items-center justify-center bg-zinc-950 px-6">
        <div className="text-center animate-scale-in">
          <span className="text-6xl block mb-4">🎉</span>
          <h1 className="text-xl font-bold text-white mb-2">{t.ui.apply_success}</h1>
          <p className="text-zinc-400 text-sm mb-6">{t.ui.apply_successDesc}</p>
          <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95 transition-transform">
            {t.ui.apply_back}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="text-amber-400 font-medium text-sm">← Menu</Link>
          <h1 className="text-sm font-bold text-white">{t.ui.apply_title}</h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="px-4 pt-6">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">🛵</span>
          <h2 className="text-lg font-bold text-white">{t.ui.apply_heading}</h2>
          <p className="text-zinc-400 text-sm mt-2">{t.ui.apply_desc}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">{t.ui.apply_fullName}</label>
            <input className={ic} placeholder={t.ui.apply_namePh} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">{t.ui.checkout_phone}</label>
            <input className={ic} placeholder="+32 470 ..." type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">Email</label>
            <input className={ic} placeholder="email@example.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">{t.ui.apply_cityLabel}</label>
            <input className={ic} placeholder={t.ui.apply_cityPh} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">{t.ui.apply_transport}</label>
            <select className={ic} value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} required>
              <option value="">{t.ui.apply_choose}</option>
              <option value="Scooter">{t.ui.apply_scooter}</option>
              <option value="Voiture">{t.ui.apply_car}</option>
              <option value="Vélo">{t.ui.apply_bike}</option>
              <option value="Vélo électrique">{t.ui.apply_ebike}</option>
              <option value="À pied">{t.ui.apply_walk}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">{t.ui.apply_availability}</label>
            <input className={ic} placeholder={t.ui.apply_availPh} value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          </div>
          <button type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold text-sm active:scale-[0.97] transition-transform shadow-lg shadow-amber-500/20 mt-4">
            {t.ui.apply_submit}
          </button>
        </form>
      </div>
    </div>
  );
}
