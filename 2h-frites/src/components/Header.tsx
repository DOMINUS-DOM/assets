'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSelector from './LanguageSelector';
import CartButton from './cart/CartButton';

interface HeaderProps {
  view: 'home' | 'category' | 'favorites';
  categoryName?: string;
  onBack: () => void;
  onFavorites: () => void;
  onReplayTutorial: () => void;
  favoriteCount: number;
}

export default function Header({ view, categoryName, onBack, onFavorites, onReplayTutorial, favoriteCount }: HeaderProps) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {view !== 'home' ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-amber-400 font-medium text-sm active:scale-95
                transition-transform shrink-0"
              aria-label={t.ui.back}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden min-[360px]:inline">{t.ui.back}</span>
            </button>
          ) : (
            <button onClick={onBack} className="flex items-center gap-2 active:scale-95 transition-transform">
              <span className="text-xl">🍟</span>
              <span className="font-bold text-base">
                <span className="text-amber-400">2H</span>
              </span>
            </button>
          )}
          {view === 'category' && categoryName && (
            <h2 className="text-sm font-semibold text-white truncate ml-1">{categoryName}</h2>
          )}
          {view === 'favorites' && (
            <h2 className="text-sm font-semibold text-white ml-1">{t.ui.favorites}</h2>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 shrink-0">
          {view === 'home' && (
            <button
              onClick={onReplayTutorial}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-zinc-400
                hover:text-white transition-colors active:scale-95"
              aria-label="Tutorial"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          <button
            onClick={onFavorites}
            className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors active:scale-95
              ${view === 'favorites' ? 'text-red-500 bg-red-500/10' : 'text-zinc-400 hover:text-white'}`}
            aria-label={t.ui.favorites}
          >
            <span className="text-lg">{view === 'favorites' ? '♥' : '♡'}</span>
            {favoriteCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center
                rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                {favoriteCount}
              </span>
            )}
          </button>
          <CartButton />
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}
