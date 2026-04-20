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
        aria-expanded={open}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl w-full bg-white border border-[#EDEBE7] hover:border-[#D4D0C8] transition-colors text-sm font-medium text-[#1A1A1A] active:scale-[0.98]"
      >
        <span className="text-orange-500">⚠️</span>
        <span>{t.allergens.title}</span>
        <svg
          className={`w-4 h-4 ml-auto text-[#8A8A8A] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 p-4 rounded-xl bg-white border border-[#EDEBE7] animate-slide-up">
          <p className="text-[11px] text-[#8A8A8A] mb-3 italic">{t.allergens.disclaimer}</p>
          <div className="grid grid-cols-2 gap-2">
            {ALLERGENS.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/10 text-orange-700 text-[11px] font-bold shrink-0">
                  {a.id}
                </span>
                <span className="text-sm">{a.icon}</span>
                <span className="text-[#6B6B6B] truncate">{t.allergens[a.key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
