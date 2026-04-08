'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Locale } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';

const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
];

const WELCOME_WORDS = ['Bienvenue', 'Welcome', 'Bienvenido', 'Welkom'];

interface Slide {
  icon: string;
  titleKey: string;
  descKey: string;
}

const SLIDES: Slide[] = [
  { icon: '🍟', titleKey: 'onb_title1', descKey: 'onb_desc1' },
  { icon: '🔍', titleKey: 'onb_title2', descKey: 'onb_desc2' },
  { icon: '❤️', titleKey: 'onb_title3', descKey: 'onb_desc3' },
  { icon: '🎲', titleKey: 'onb_title4', descKey: 'onb_desc4' },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { setLocale, t } = useLanguage();
  const [phase, setPhase] = useState<'language' | 'slides'>('language');
  const [slideIndex, setSlideIndex] = useState(0);
  const [welcomeIndex, setWelcomeIndex] = useState(0);
  const [fadeWelcome, setFadeWelcome] = useState(true);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [animating, setAnimating] = useState(false);

  // Touch handling for swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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

  const goToSlide = useCallback(
    (direction: 'next' | 'prev') => {
      if (animating) return;
      if (direction === 'next' && slideIndex === SLIDES.length - 1) {
        onComplete();
        return;
      }
      if (direction === 'prev' && slideIndex === 0) return;

      setAnimating(true);
      setSlideDir(direction === 'next' ? 'left' : 'right');
      setTimeout(() => {
        setSlideIndex((i) => (direction === 'next' ? i + 1 : i - 1));
        setAnimating(false);
      }, 250);
    },
    [slideIndex, onComplete, animating]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      goToSlide(diff > 0 ? 'next' : 'prev');
    }
  };

  // LANGUAGE SELECTION
  if (phase === 'language') {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="text-center mb-10">
          <span className="text-6xl block mb-4">🍟</span>
          <h1 className="text-2xl font-extrabold">
            <span className="text-amber-400">2H</span>{' '}
            <span className="text-white">Frites Artisanales</span>
          </h1>
          <p className="text-zinc-500 text-xs font-medium mt-1 tracking-wider uppercase">
            Les Deux Haine
          </p>
          <p
            className={`text-zinc-400 text-lg mt-6 font-medium transition-opacity duration-300 ${
              fadeWelcome ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {WELCOME_WORDS[welcomeIndex]} 👋
          </p>
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

  // TUTORIAL SLIDES
  const slide = SLIDES[slideIndex];
  const isLast = slideIndex === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip */}
      <div className="flex justify-end p-4">
        <button
          onClick={onComplete}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1"
        >
          {t.ui.onbSkip}
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div
          key={slideIndex}
          className={`text-center ${
            animating
              ? slideDir === 'left'
                ? 'animate-slideOutLeft'
                : 'animate-slideOutRight'
              : 'animate-slideIn'
          }`}
        >
          <span className="text-7xl block mb-6">{slide.icon}</span>
          <h2 className="text-2xl font-bold text-white mb-3">
            {t.ui[slide.titleKey]}
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-[280px] mx-auto">
            {t.ui[slide.descKey]}
          </p>
        </div>
      </div>

      {/* Dots + button */}
      <div className="pb-10 px-6">
        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === slideIndex
                  ? 'w-6 bg-amber-400'
                  : 'w-2 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => goToSlide('next')}
          className={`w-full py-4 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform
            ${
              isLast
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
        >
          {isLast ? t.ui.onbStart : t.ui.onbNext}
        </button>
      </div>
    </div>
  );
}
