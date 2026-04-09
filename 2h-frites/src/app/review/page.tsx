'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import Link from 'next/link';

function ReviewContent() {
  const params = useSearchParams();
  const orderId = params.get('order') || '';
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !name) return;
    await api.post('/reviews', { action: 'create', orderId, customerName: name, customerPhone: phone, rating, comment });
    setSubmitted(true);
  };

  const ic = 'w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="text-center animate-scale-in">
          <span className="text-6xl block mb-4">🎉</span>
          <h1 className="text-xl font-bold text-white mb-2">{t.ui.rev_thanks}</h1>
          <p className="text-zinc-400 text-sm mb-6">{t.ui.rev_thanksDesc}</p>
          <Link href="/" className="px-6 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm">← Menu</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="text-amber-400 font-medium text-sm">← Menu</Link>
          <h1 className="text-sm font-bold text-white">{t.ui.rev_leave}</h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="px-4 pt-6">
        <div className="text-center mb-6">
          <span className="text-4xl block mb-2">⭐</span>
          <h2 className="text-lg font-bold text-white">{t.ui.rev_howWas}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setRating(s)}
                className={`text-4xl transition-transform ${s <= rating ? 'text-amber-400 scale-110' : 'text-zinc-700'}`}>
                ★
              </button>
            ))}
          </div>

          <input className={ic} placeholder={t.ui.checkout_name} value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={ic} placeholder={t.ui.checkout_phone} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <textarea className={`${ic} h-24 resize-none`} placeholder={t.ui.rev_commentPlaceholder} value={comment} onChange={(e) => setComment(e.target.value)} />

          <button type="submit" disabled={rating === 0}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-50">
            {t.ui.rev_submit}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return <Suspense fallback={null}><ReviewContent /></Suspense>;
}
