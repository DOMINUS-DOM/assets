'use client';

import { useState } from 'react';
import { ALLERGENS } from '@/data/allergens';
import { useLanguage } from '@/i18n/LanguageContext';

export default function AllergenLegend() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-4 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl w-full
          bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-colors
          text-sm font-medium text-zinc-300 active:scale-[0.98]"
      >
        <span className="text-orange-400">⚠️</span>
        <span>{t.allergens.title}</span>
        <svg
          className={`w-4 h-4 ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 animate-slide-up">
          <p className="text-[11px] text-zinc-500 mb-3 italic">{t.allergens.disclaimer}</p>
          <div className="grid grid-cols-2 gap-2">
            {ALLERGENS.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full
                  bg-orange-500/15 text-orange-300 text-[11px] font-bold shrink-0">
                  {a.id}
                </span>
                <span className="text-sm">{a.icon}</span>
                <span className="text-zinc-300 truncate">{t.allergens[a.key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
