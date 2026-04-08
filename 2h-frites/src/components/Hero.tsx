'use client';

import { useLanguage } from '@/i18n/LanguageContext';

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section className="text-center py-8 px-4">
      <div className="mb-2">
        <span className="text-5xl">🍟</span>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">
        <span className="text-amber-400">2H</span>{' '}
        <span className="text-white">Frites Artisanales</span>
      </h1>
      <p className="text-zinc-500 text-sm font-medium mt-1 tracking-wide uppercase">
        Les Deux Haine
      </p>
      <p className="text-zinc-400 text-sm mt-3 max-w-xs mx-auto">
        {t.ui.slogan}
      </p>
    </section>
  );
}
