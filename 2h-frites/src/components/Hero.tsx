'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

export default function Hero() {
  const { t } = useLanguage();
  const [sloganIndex, setSloganIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const slogans = [
    t.ui.slogan,
    t.ui.slogan2,
    t.ui.slogan3,
    t.ui.slogan4,
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setSloganIndex((i) => (i + 1) % slogans.length);
        setFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [slogans.length]);

  return (
    <section className="text-center py-8 px-4">
      <div className="mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="2H Frites Artisanales" className="h-20 w-auto mx-auto" />
      </div>
      <p
        className={`text-zinc-400 text-sm mt-3 max-w-xs mx-auto transition-opacity duration-300 ${
          fade ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {slogans[sloganIndex]}
      </p>
    </section>
  );
}
