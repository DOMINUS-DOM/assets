'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import { useTenant, useIsDemo } from '@/contexts/TenantContext';
import { getCloudinaryUrl } from '@/lib/cloudinaryUrl';
import LanguageSelector from './LanguageSelector';
import CartButton from './cart/CartButton';
import UserMenu from './auth/UserMenu';

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
  const { tenant } = useTenant();
  const isDemo = useIsDemo();

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#EDEBE7]">
      {isDemo && (
        <a
          href="https://brizoapp.com/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-white border-b border-[#EDEBE7] text-center py-1.5 text-[11px] text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-2 align-middle" />
          Démo Brizo · utilisé en conditions réelles <span className="text-[#1A1A1A] font-semibold ml-1">→ créer le mien</span>
        </a>
      )}
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {view !== 'home' ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-[#1A1A1A] font-medium text-sm active:scale-95 transition-transform shrink-0"
              aria-label={t.ui.back}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden min-[360px]:inline">{t.ui.back}</span>
            </button>
          ) : (
            <button onClick={onBack} className="active:scale-95 transition-transform flex items-center gap-2 min-w-0">
              {/* Logo only when a real logoUrl is set — never fall back to favicon,
                  which on a plain tenant would show the Brizo mark client-side. */}
              {tenant?.branding?.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getCloudinaryUrl(tenant.branding.logoUrl, 'admin-preview') || undefined}
                  alt={tenant.branding.brandName || tenant.name || 'Restaurant'}
                  className="h-7 w-7 object-contain shrink-0"
                />
              )}
              <span className="text-[16px] font-extrabold text-[#1A1A1A] truncate max-w-[14rem] tracking-[-0.015em]">
                {tenant?.branding?.brandName || tenant?.name || ''}
              </span>
            </button>
          )}
          {view === 'category' && categoryName && (
            <h2 className="text-sm font-semibold text-[#1A1A1A] truncate ml-1">{categoryName}</h2>
          )}
          {view === 'favorites' && (
            <h2 className="text-sm font-semibold text-[#1A1A1A] ml-1">{t.ui.favorites}</h2>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 shrink-0">
          {view === 'home' && (
            <button
              onClick={onReplayTutorial}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors active:scale-95"
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
              ${view === 'favorites' ? 'text-red-600 bg-red-500/10' : 'text-[#8A8A8A] hover:text-[#1A1A1A]'}`}
            aria-label={t.ui.favorites}
          >
            <span className="text-lg">{view === 'favorites' ? '♥' : '♡'}</span>
            {favoriteCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center
                rounded-full bg-red-600 text-white text-[10px] font-bold px-1">
                {favoriteCount}
              </span>
            )}
          </button>
          <CartButton />
          <UserMenu />
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}
