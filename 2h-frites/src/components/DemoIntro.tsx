'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import type { Locale } from '@/types';

interface DemoIntroProps {
  onStart: () => void;
}

// Shown once (per browser, per demo tenant) before the menu.
// Single screen, three choices. Kept intentionally sober: no gradients on
// page chrome, gradient accent is reserved for the Brizo mark only.
const DEMO_LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function DemoIntro({ onStart }: DemoIntroProps) {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="fixed inset-0 z-[100] bg-[#FAFAF8] text-[#1A1A1A] overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-10 max-w-[480px] mx-auto">

        {/* Brand mark */}
        <div className="flex items-center gap-2 mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brizo-icon.svg" alt="Brizo" className="h-6 w-6" />
          <span className="text-[13px] font-semibold tracking-tight text-[#1A1A1A]">Brizo</span>
          <span className="px-1.5 py-0.5 rounded-md bg-[#1A1A1A]/5 text-[10px] font-medium text-[#6B6B6B] tracking-wide">DÉMO PRODUIT</span>
        </div>

        {/* Headline + sub */}
        <div className="text-center mb-10">
          <h1 className="text-[30px] md:text-[36px] font-extrabold tracking-[-0.03em] leading-[1.08] mb-4">
            Testez un restaurant<br />en conditions réelles
          </h1>
          <p className="text-[15px] text-[#6B6B6B] leading-relaxed max-w-[380px] mx-auto">
            Une démo interactive. Passez une commande pour voir concrètement
            ce que Brizo peut faire pour votre restaurant.
          </p>
        </div>

        {/* Language pills — horizontal, compact */}
        <div className="flex gap-2 mb-8 w-full justify-center">
          {DEMO_LOCALES.map((l) => {
            const active = locale === l.code;
            return (
              <button
                key={l.code}
                onClick={() => setLocale(l.code)}
                aria-pressed={active}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-[14px] font-semibold tracking-tight transition-colors ${
                  active
                    ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                    : 'bg-white border-[#EDEBE7] text-[#1A1A1A] hover:border-[#1A1A1A]/30'
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            );
          })}
        </div>

        {/* Primary CTA — solid black, premium */}
        <button
          onClick={onStart}
          className="w-full py-4 rounded-xl bg-[#1A1A1A] text-white font-semibold text-[15px] hover:bg-black transition-colors active:scale-[0.99]"
        >
          Commencer la démo
        </button>

        {/* Restaurateur card — direct signup CTA */}
        <a
          href="https://brizoapp.com/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 w-full rounded-xl bg-white border border-[#EDEBE7] px-4 py-3.5 flex items-center justify-between hover:border-[#1A1A1A]/30 transition-colors"
        >
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#F59E0B]">
              Vous êtes restaurateur ?
            </p>
            <p className="text-[13px] text-[#1A1A1A] mt-0.5">
              Passez cette démo et créez votre resto en 10 min
            </p>
          </div>
          <span className="text-[#6B6B6B] text-lg shrink-0 ml-3">→</span>
        </a>
      </div>
    </div>
  );
}
