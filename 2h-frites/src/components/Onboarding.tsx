'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Locale } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import { useTenant } from '@/contexts/TenantContext';

/* ───── Language data ───── */
const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
];

const WELCOME_WORDS = ['Bienvenue', 'Welcome', 'Bienvenido', 'Welkom'];

// Generic brand mark: tenant logo if set, else tenant name in text, else nothing.
// Avoids a 2H-branded fallback image for tenants with no logo.
function TenantBrandMark({ className = '' }: { className?: string }) {
  const { tenant } = useTenant();
  const name = tenant?.branding?.brandName || tenant?.name || '';
  if (tenant?.branding?.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={tenant.branding.logoUrl} alt={name || 'Restaurant'} className={`object-contain ${className}`} />;
  }
  if (name) return <p className={`text-2xl font-extrabold text-white tracking-tight ${className}`}>{name}</p>;
  return null;
}

/* ═══════════════════════════════════════════
   ANIMATED DEMOS — one per slide
   ═══════════════════════════════════════════ */

/* Slide 1: Welcome — logo + food icons */
function DemoWelcome() {
  return (
    <div className="flex flex-col items-center gap-4">
      <TenantBrandMark className="h-16 w-auto animate-fade-in" />
      <div className="flex gap-2 mt-1">
        {['🍔', '🥤', '🥩', '🫙', '🥗'].map((e, i) => (
          <span
            key={i}
            className="text-2xl animate-slide-up"
            style={{ animationDelay: `${400 + i * 150}ms`, animationFillMode: 'backwards' }}
          >
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Slide 2: Browse — clickable category cards */
function DemoBrowse({ onSelectCategory }: { onSelectCategory?: (slug: string) => void }) {
  const { getCategory } = useLanguage();
  const cats = [
    { icon: '🍟', nameKey: 'frites', slug: 'frites' },
    { icon: '🥖', nameKey: 'pain_frites', slug: 'pain-frites' },
    { icon: '🍔', nameKey: 'pains_ronds', slug: 'pains-ronds' },
    { icon: '🥩', nameKey: 'viandes', slug: 'viandes' },
    { icon: '🫙', nameKey: 'sauces', slug: 'sauces' },
    { icon: '🎁', nameKey: 'magic_box', slug: 'magic-box' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 w-64 mx-auto">
      {cats.map((c, i) => (
        <button
          key={i}
          onClick={() => onSelectCategory?.(c.slug)}
          className="flex flex-col items-center gap-1 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700/50
            hover:border-amber-500/40 hover:bg-zinc-800 active:scale-95 transition-all
            animate-slide-up cursor-pointer"
          style={{ animationDelay: `${300 + i * 100}ms`, animationFillMode: 'backwards' }}
        >
          <span className="text-2xl">{c.icon}</span>
          <span className="text-[10px] text-zinc-300 font-medium">{getCategory(c.nameKey)}</span>
        </button>
      ))}
    </div>
  );
}

/* Slide 3: Pain-frites builder — step animation */
function DemoPainFrites() {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const steps = [
    { emoji: '🥖🍟', labelKey: 'onb_bread_frites', sub: '5,00 €' },
    { emoji: '🥩', labelKey: 'onb_meat', sub: '+3,00 €' },
    { emoji: '🫙', labelKey: 'onb_sauce', sub: '+0,90 €' },
    { emoji: '🥬', labelKey: 'onb_topping', sub: '+0,60 €' },
  ];

  useEffect(() => {
    const timers = steps.map((_, i) => setTimeout(() => setStep(i), 600 + i * 800));
    const reset = setTimeout(() => setStep(0), 600 + steps.length * 800 + 1000);
    return () => { timers.forEach(clearTimeout); clearTimeout(reset); };
  }, []);

  return (
    <div className="w-56 mx-auto space-y-2">
      {steps.map((s, i) => (
        <div
          key={i}
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 ${
            i <= step ? 'bg-zinc-800 border border-amber-500/20 opacity-100' : 'bg-zinc-800/30 border border-zinc-800/20 opacity-30'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`text-lg transition-transform duration-300 ${i === step ? 'scale-125' : ''}`}>{s.emoji}</span>
            <span className={`text-xs font-medium ${i <= step ? 'text-white' : 'text-zinc-600'}`}>{t.ui[s.labelKey]}</span>
          </div>
          <span className={`text-xs font-bold ${i <= step ? 'text-amber-400' : 'text-zinc-700'}`}>{s.sub}</span>
        </div>
      ))}
      {step >= 3 && (
        <div className="text-center pt-1 animate-fade-in">
          <span className="text-xs font-bold text-emerald-400">{t.ui.onb_total} : 9,50 €</span>
        </div>
      )}
    </div>
  );
}

/* Slide 4: Add to cart — item with + button animating */
function DemoAddToCart() {
  const { t, getItemName } = useLanguage();
  const [added, setAdded] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setAdded(1), 800),
      setTimeout(() => setAdded(2), 1600),
      setTimeout(() => setAdded(3), 2400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const items = [
    { id: 'frites', name: 'Frites', price: '3,80 €', emoji: '🍟' },
    { id: 'fricadelle', name: 'Fricadelle', price: '3,00 €', emoji: '🌭' },
    { id: 'sauce_samourai', name: 'Samouraï', price: '0,90 €', emoji: '🫙' },
  ];

  return (
    <div className="w-60 mx-auto space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/50
            animate-slide-up"
          style={{ animationDelay: `${200 + i * 100}ms`, animationFillMode: 'backwards' }}
        >
          <span className="text-lg">{item.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-medium">{getItemName(item.id, item.name)}</p>
            <p className="text-[10px] text-amber-400 font-bold">{item.price}</p>
          </div>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
            ${i < added ? 'bg-emerald-500 text-white scale-110' : 'bg-amber-500 text-zinc-950'}`}>
            {i < added ? '✓' : '+'}
          </div>
        </div>
      ))}
      {added > 0 && (
        <div className="flex items-center justify-center gap-2 pt-2 animate-fade-in">
          <span className="text-sm">🛒</span>
          <span className="text-xs font-bold text-amber-400">{added} {t.ui.onb_articles}</span>
        </div>
      )}
    </div>
  );
}

/* Slide 5: Choose pickup or delivery */
function DemoOrderType() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'pickup' | 'delivery'>('pickup');

  useEffect(() => {
    const interval = setInterval(() => {
      setMode((m) => (m === 'pickup' ? 'delivery' : 'pickup'));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-56 mx-auto space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className={`py-3 rounded-xl text-center text-sm font-semibold transition-all duration-500 ${
          mode === 'pickup' ? 'bg-amber-500 text-zinc-950 scale-105' : 'bg-zinc-800 text-zinc-500 scale-95'
        }`}>
          🏪 {t.ui.onb_pickup}
        </div>
        <div className={`py-3 rounded-xl text-center text-sm font-semibold transition-all duration-500 ${
          mode === 'delivery' ? 'bg-amber-500 text-zinc-950 scale-105' : 'bg-zinc-800 text-zinc-500 scale-95'
        }`}>
          🛵 {t.ui.onb_delivery}
        </div>
      </div>
      <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/30 animate-fade-in" key={mode}>
        {mode === 'pickup' ? (
          <div className="text-center space-y-1">
            <span className="text-3xl">🏪</span>
            <p className="text-[11px] text-zinc-300">{t.ui.onb_pickup_desc}</p>
          </div>
        ) : (
          <div className="text-center space-y-1">
            <span className="text-3xl">🛵</span>
            <p className="text-[11px] text-zinc-300">{t.ui.onb_delivery_desc}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* Slide 6: Track order */
function DemoTrack() {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const steps = [
    { emoji: '📋', labelKey: 'onb_track_received' },
    { emoji: '👨‍🍳', labelKey: 'onb_track_cooking' },
    { emoji: '✅', labelKey: 'onb_track_ready' },
    { emoji: '🛵', labelKey: 'onb_track_onway' },
    { emoji: '🎉', labelKey: 'onb_track_delivered' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < steps.length - 1 ? s + 1 : 0));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-56 mx-auto space-y-2">
      {steps.map((s, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
            i <= step ? 'bg-zinc-800 border border-amber-500/20' : 'bg-zinc-800/30 border border-zinc-800/20 opacity-40'
          }`}
        >
          <span className={`text-lg transition-transform duration-300 ${i === step ? 'scale-125' : ''}`}>{s.emoji}</span>
          <span className={`text-xs font-medium transition-colors ${i <= step ? 'text-white' : 'text-zinc-600'}`}>{t.ui[s.labelKey]}</span>
          {i === step && <span className="ml-auto text-amber-400 text-[10px] font-bold animate-pulse">●</span>}
        </div>
      ))}
    </div>
  );
}

/* Slide 7: Ready! */
function DemoReady() {
  return (
    <div className="flex flex-col items-center gap-4">
      <TenantBrandMark className="h-14 w-auto" />
      <div className="flex flex-wrap justify-center gap-3 w-56 mx-auto">
        {['🎉', '😋', '🔥', '❤️'].map((e, i) => (
          <span
            key={i}
            className="text-4xl animate-scale-in"
            style={{ animationDelay: `${200 + i * 150}ms`, animationFillMode: 'backwards' }}
          >
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLIDE CONFIG
   ═══════════════════════════════════════════ */
interface SlideConfig {
  titleKey: string;
  descKey: string;
  Demo: React.FC<{ onSelectCategory?: (slug: string) => void }>;
}

const SLIDES: SlideConfig[] = [
  { titleKey: 'onb_title1', descKey: 'onb_desc1', Demo: DemoWelcome },
  { titleKey: 'onb_title2', descKey: 'onb_desc2', Demo: DemoBrowse },
  { titleKey: 'onb_title_painfrites', descKey: 'onb_desc_painfrites', Demo: DemoPainFrites },
  { titleKey: 'onb_title3', descKey: 'onb_desc3', Demo: DemoAddToCart },
  { titleKey: 'onb_title4', descKey: 'onb_desc4', Demo: DemoOrderType },
  { titleKey: 'onb_title5', descKey: 'onb_desc5', Demo: DemoTrack },
  { titleKey: 'onb_title6', descKey: 'onb_desc6', Demo: DemoReady },
];

/* ═══════════════════════════════════════════
   MAIN ONBOARDING COMPONENT
   ═══════════════════════════════════════════ */
interface OnboardingProps {
  onComplete: (selectedCategory?: string) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { setLocale, t } = useLanguage();
  const [phase, setPhase] = useState<'language' | 'slides'>('language');
  const [slideIndex, setSlideIndex] = useState(0);
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const [fadeWelcome, setFadeWelcome] = useState(true);
  const [slideKey, setSlideKey] = useState(0);
  const touchStartX = useRef(0);

  // Cycling welcome
  useEffect(() => {
    if (phase !== 'language') return;
    const interval = setInterval(() => {
      setFadeWelcome(false);
      setTimeout(() => {
        setWelcomeIndex((i) => (i + 1) % WELCOME_WORDS.length);
        setFadeWelcome(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleSelectLanguage = useCallback(
    (code: Locale) => { setLocale(code); setPhase('slides'); },
    [setLocale]
  );

  const handleSelectCategory = useCallback((slug: string) => {
    onComplete(slug);
  }, [onComplete]);

  const goNext = useCallback(() => {
    if (slideIndex === SLIDES.length - 1) { onComplete(); return; }
    setSlideIndex((i) => i + 1);
    setSlideKey((k) => k + 1);
  }, [slideIndex, onComplete]);

  const goPrev = useCallback(() => {
    if (slideIndex === 0) return;
    setSlideIndex((i) => i - 1);
    setSlideKey((k) => k + 1);
  }, [slideIndex]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? goNext() : goPrev(); }
  };

  /* ── LANGUAGE SELECTION ── */
  if (phase === 'language') {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="text-center mb-10">
          <div className="mb-4 flex justify-center"><TenantBrandMark className="h-16 w-auto" /></div>
          <div className="mt-4 h-8 flex items-center justify-center">
            <p className={`text-zinc-400 text-lg font-medium transition-opacity duration-300 ${fadeWelcome ? 'opacity-100' : 'opacity-0'}`}>
              {WELCOME_WORDS[welcomeIndex]} 👋
            </p>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-3">
          {LOCALES.map((l, i) => (
            <button
              key={l.code}
              onClick={() => handleSelectLanguage(l.code)}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-zinc-900 border border-zinc-800
                hover:border-amber-500/30 hover:bg-zinc-800/80 transition-all active:scale-[0.97]
                animate-slide-up"
              style={{ animationDelay: `${200 + i * 80}ms`, animationFillMode: 'backwards' }}
            >
              <span className="text-3xl">{l.flag}</span>
              <span className="text-base font-semibold text-white">{l.label}</span>
              <svg className="w-5 h-5 text-zinc-600 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── TUTORIAL SLIDES ── */
  const slide = SLIDES[slideIndex];
  const isLast = slideIndex === SLIDES.length - 1;
  const Demo = slide.Demo;

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <span className="text-xs text-zinc-500 font-medium">{slideIndex + 1} / {SLIDES.length}</span>
        <button onClick={() => onComplete()} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1 rounded-lg active:bg-zinc-800">
          {t.ui.onbSkip} →
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div key={slideKey} className="relative mb-8 min-h-[200px] flex items-center justify-center animate-fade-in">
          <Demo onSelectCategory={handleSelectCategory} />
        </div>
        <div key={`text-${slideKey}`} className="text-center animate-slide-up">
          <h2 className="text-xl font-bold text-white mb-2">{t.ui[slide.titleKey] || slide.titleKey}</h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[300px] mx-auto">{t.ui[slide.descKey] || slide.descKey}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="pb-10 px-6">
        <div className="flex justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setSlideIndex(i); setSlideKey((k) => k + 1); }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === slideIndex ? 'w-8 bg-amber-400' : 'w-2 bg-zinc-700 hover:bg-zinc-600'
              }`}
            />
          ))}
        </div>
        <div className="flex gap-3">
          {slideIndex > 0 && (
            <button onClick={goPrev} className="px-6 py-4 rounded-2xl bg-zinc-800 text-white font-semibold text-sm active:scale-[0.97] transition-transform">
              ←
            </button>
          )}
          <button
            onClick={goNext}
            className={`flex-1 py-4 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform ${
              isLast
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                : 'bg-amber-500 text-zinc-950'
            }`}
          >
            {isLast ? t.ui.onbStart : t.ui.onbNext + ' →'}
          </button>
        </div>
      </div>
    </div>
  );
}
