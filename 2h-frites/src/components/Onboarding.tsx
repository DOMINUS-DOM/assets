'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Locale } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';

/* ───── Language data ───── */
const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
];

const WELCOME_WORDS = ['Bienvenue', 'Welcome', 'Bienvenido', 'Welkom'];

/* ───── Animated Demo: Categories ───── */
function DemoCategories() {
  const cats = [
    { icon: '🍟', color: 'from-amber-500/20 to-amber-600/10' },
    { icon: '🥩', color: 'from-red-500/20 to-red-600/10' },
    { icon: '🫙', color: 'from-orange-500/20 to-orange-600/10' },
    { icon: '🥤', color: 'from-blue-500/20 to-blue-600/10' },
    { icon: '🍔', color: 'from-yellow-500/20 to-yellow-600/10' },
    { icon: '🔥', color: 'from-red-500/20 to-red-600/10' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 w-56 mx-auto">
      {cats.map((cat, i) => (
        <div
          key={i}
          className={`flex items-center justify-center h-16 rounded-xl bg-gradient-to-br ${cat.color}
            border border-zinc-700/50 animate-slide-up`}
          style={{ animationDelay: `${300 + i * 120}ms`, animationFillMode: 'backwards' }}
        >
          <span className="text-2xl">{cat.icon}</span>
        </div>
      ))}
      {/* Animated tap finger */}
      <div
        className="absolute -bottom-2 right-12 text-2xl animate-tapFinger"
        style={{ animationDelay: '1.2s', animationFillMode: 'backwards' }}
      >
        👆
      </div>
    </div>
  );
}

/* ───── Animated Demo: Search ───── */
function DemoSearch() {
  const [typedText, setTypedText] = useState('');
  const [showResults, setShowResults] = useState(false);
  const fullText = 'nuggets';

  useEffect(() => {
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => setShowResults(true), 300);
      }
    }, 150);
    return () => clearInterval(typeInterval);
  }, []);

  return (
    <div className="w-60 mx-auto space-y-2">
      {/* Mini search bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700">
        <span className="text-zinc-500 text-sm">🔍</span>
        <span className="text-sm text-white">
          {typedText}
          <span className="animate-pulse text-amber-400">|</span>
        </span>
      </div>
      {/* Results */}
      {showResults && (
        <div className="space-y-1.5 animate-slide-up">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50">
            <div>
              <p className="text-xs text-zinc-500">Viandes</p>
              <p className="text-sm text-white font-medium">Nuggets</p>
            </div>
            <span className="text-sm font-bold text-amber-400">4,50 €</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/30 opacity-60">
            <div>
              <p className="text-xs text-zinc-500">Viandes</p>
              <p className="text-sm text-white font-medium">Chickenburger</p>
            </div>
            <span className="text-sm font-bold text-amber-400">3,50 €</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Animated Demo: Favorites ───── */
function DemoFavorites() {
  const [hearts, setHearts] = useState([false, false, false]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const timers = [
      setTimeout(() => { setActiveIndex(0); setHearts([true, false, false]); }, 800),
      setTimeout(() => { setActiveIndex(1); setHearts([true, true, false]); }, 1600),
      setTimeout(() => { setActiveIndex(2); setHearts([true, true, true]); }, 2400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const items = [
    { name: 'Fricadelle', price: '3,00 €' },
    { name: 'Samouraï', price: '0,90 €' },
    { name: 'Frites', price: '2,80 €' },
  ];

  return (
    <div className="w-60 mx-auto space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-300
            ${hearts[i]
              ? 'bg-zinc-800 border-amber-500/20'
              : 'bg-zinc-800/60 border-zinc-700/50'
            }`}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-lg transition-all duration-300 ${
                hearts[i] ? 'text-red-500 scale-125' : 'text-zinc-600'
              } ${activeIndex === i ? 'animate-heartPop' : ''}`}
            >
              {hearts[i] ? '♥' : '♡'}
            </span>
            <span className="text-sm text-white font-medium">{item.name}</span>
          </div>
          <span className="text-xs font-bold text-amber-400">{item.price}</span>
        </div>
      ))}
    </div>
  );
}

/* ───── Animated Demo: Surprise ───── */
function DemoSurprise() {
  const emojis = ['🍟', '🥩', '🍔', '🫙', '🥤', '🔥', '🥖', '🎁'];
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'spin' | 'done'>('spin');

  useEffect(() => {
    const spin = setInterval(() => {
      setIndex((i) => (i + 1) % emojis.length);
    }, 100);

    const stop = setTimeout(() => {
      clearInterval(spin);
      setPhase('done');
    }, 2000);

    return () => { clearInterval(spin); clearTimeout(stop); };
  }, []);

  return (
    <div className="flex flex-col items-center w-56 mx-auto">
      {/* Mini surprise button */}
      <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500
        text-center text-zinc-950 font-bold text-sm mb-4 animate-pulse">
        🎲 Surprise !
      </div>
      {/* Result */}
      <div className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-500
        ${phase === 'done'
          ? 'bg-zinc-800 border-amber-500/30 scale-100 opacity-100'
          : 'bg-zinc-800/50 border-zinc-700/30 scale-95 opacity-80'
        }`}>
        <span className={`text-4xl ${phase === 'spin' ? 'animate-bounce' : ''}`}>
          {phase === 'done' ? '🥩' : emojis[index]}
        </span>
        {phase === 'done' && (
          <div className="text-center animate-fade-in">
            <p className="text-sm font-bold text-white">Brochette tzigane</p>
            <p className="text-lg font-extrabold text-amber-400">3,80 €</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── Slide definitions ───── */
interface SlideConfig {
  titleKey: string;
  descKey: string;
  Demo: React.FC;
}

const SLIDES: SlideConfig[] = [
  { titleKey: 'onb_title1', descKey: 'onb_desc1', Demo: DemoCategories },
  { titleKey: 'onb_title2', descKey: 'onb_desc2', Demo: DemoSearch },
  { titleKey: 'onb_title3', descKey: 'onb_desc3', Demo: DemoFavorites },
  { titleKey: 'onb_title4', descKey: 'onb_desc4', Demo: DemoSurprise },
];

/* ───── Main Onboarding Component ───── */
interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { setLocale, t } = useLanguage();
  const [phase, setPhase] = useState<'language' | 'slides'>('language');
  const [slideIndex, setSlideIndex] = useState(0);
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const [fadeWelcome, setFadeWelcome] = useState(true);
  const [slideKey, setSlideKey] = useState(0); // force re-mount demos

  const touchStartX = useRef(0);

  // Cycling welcome text
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
    (code: Locale) => {
      setLocale(code);
      setPhase('slides');
    },
    [setLocale]
  );

  const goNext = useCallback(() => {
    if (slideIndex === SLIDES.length - 1) {
      onComplete();
      return;
    }
    setSlideIndex((i) => i + 1);
    setSlideKey((k) => k + 1);
  }, [slideIndex, onComplete]);

  const goPrev = useCallback(() => {
    if (slideIndex === 0) return;
    setSlideIndex((i) => i - 1);
    setSlideKey((k) => k + 1);
  }, [slideIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goNext() : goPrev();
    }
  };

  /* ── LANGUAGE SELECTION ── */
  if (phase === 'language') {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="text-center mb-10">
          <span className="text-6xl block mb-4 animate-bounce" style={{ animationDuration: '2s' }}>🍟</span>
          <h1 className="text-2xl font-extrabold">
            <span className="text-amber-400">2H</span>{' '}
            <span className="text-white">Frites Artisanales</span>
          </h1>
          <p className="text-zinc-500 text-xs font-medium mt-1 tracking-wider uppercase">
            Les Deux Haine
          </p>
          <div className="mt-6 h-8 flex items-center justify-center">
            <p
              className={`text-zinc-400 text-lg font-medium transition-opacity duration-300 ${
                fadeWelcome ? 'opacity-100' : 'opacity-0'
              }`}
            >
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
      {/* Header: step counter + skip */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <span className="text-xs text-zinc-500 font-medium">
          {slideIndex + 1} / {SLIDES.length}
        </span>
        <button
          onClick={onComplete}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1 rounded-lg
            active:bg-zinc-800"
        >
          {t.ui.onbSkip} →
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Animated demo area */}
        <div key={slideKey} className="relative mb-8 min-h-[200px] flex items-center justify-center animate-fade-in">
          <Demo />
        </div>

        {/* Text */}
        <div key={`text-${slideKey}`} className="text-center animate-slide-up">
          <h2 className="text-xl font-bold text-white mb-2">
            {t.ui[slide.titleKey]}
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[300px] mx-auto">
            {t.ui[slide.descKey]}
          </p>
        </div>
      </div>

      {/* Bottom: dots + navigation */}
      <div className="pb-10 px-6">
        {/* Dot indicators */}
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

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {slideIndex > 0 && (
            <button
              onClick={goPrev}
              className="px-6 py-4 rounded-2xl bg-zinc-800 text-white font-semibold text-sm
                active:scale-[0.97] transition-transform"
            >
              ←
            </button>
          )}
          <button
            onClick={goNext}
            className={`flex-1 py-4 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform
              ${isLast
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
