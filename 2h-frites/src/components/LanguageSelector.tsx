'use client';

import { useState, useRef, useEffect } from 'react';
import { Locale } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';

const locales: { code: Locale; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
];

export default function LanguageSelector() {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = locales.find((l) => l.code === locale)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700
          transition-colors text-sm font-medium active:scale-95"
        aria-label="Select language"
      >
        <span>{current.flag}</span>
        <span className="uppercase">{current.code}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-zinc-800 border border-zinc-700 rounded-xl
          shadow-xl overflow-hidden z-50 min-w-[160px] animate-scale-in">
          {locales.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLocale(l.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors
                ${l.code === locale ? 'bg-amber-500/10 text-amber-400' : 'hover:bg-zinc-700 text-zinc-300'}`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === locale && <span className="ml-auto text-amber-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
