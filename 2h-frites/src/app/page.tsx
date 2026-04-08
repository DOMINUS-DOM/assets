'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { categories } from '@/data/menu';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSearch } from '@/hooks/useSearch';
import { useFavorites } from '@/hooks/useFavorites';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SearchBar from '@/components/SearchBar';
import CategoryGrid from '@/components/CategoryGrid';
import CategoryView from '@/components/CategoryView';
import MenuItemCard from '@/components/MenuItemCard';
import BackToTop from '@/components/BackToTop';
import AllergenLegend from '@/components/AllergenLegend';
import SurpriseMe from '@/components/SurpriseMe';
import Onboarding from '@/components/Onboarding';

type View = 'home' | 'category' | 'favorites';

export default function HomePage() {
  const { locale, t, getCategory } = useLanguage();
  const { isFavorite, toggleFavorite, count: favCount } = useFavorites();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>('home');
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSurprise, setShowSurprise] = useState(false);

  // ALL hooks must be called before any conditional return
  const searchResults = useSearch(searchQuery, locale);

  const activeCategory = useMemo(
    () => (activeSlug ? categories.find((c) => c.slug === activeSlug) || null : null),
    [activeSlug]
  );

  const favoriteItems = useMemo(
    () =>
      categories.flatMap((cat) =>
        cat.items
          .filter((item) => isFavorite(item.id))
          .map((item) => ({ item, category: cat }))
      ),
    [isFavorite]
  );

  useEffect(() => {
    try {
      const done = localStorage.getItem('2h-onboarded');
      if (!done) {
        setShowOnboarding(true);
      }
    } catch {}
    setReady(true);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    try { localStorage.setItem('2h-onboarded', 'true'); } catch {}
    setShowOnboarding(false);
  }, []);

  const handleReplayTutorial = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  const handleSelectCategory = useCallback((slug: string) => {
    setActiveSlug(slug);
    setView('category');
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = useCallback(() => {
    setView('home');
    setActiveSlug(null);
    setSearchQuery('');
  }, []);

  const handleFavorites = useCallback(() => {
    if (view === 'favorites') {
      setView('home');
      setActiveSlug(null);
      setSearchQuery('');
    } else {
      setView('favorites');
      setActiveSlug(null);
      setSearchQuery('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [view]);

  // Conditional renders AFTER all hooks
  if (!ready) return null;

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20">
      <Header
        view={view}
        categoryName={activeCategory ? getCategory(activeCategory.nameKey) : undefined}
        onBack={handleBack}
        onFavorites={handleFavorites}
        onReplayTutorial={handleReplayTutorial}
        favoriteCount={favCount}
      />

      {/* HOME VIEW */}
      {view === 'home' && (
        <>
          <Hero />
          <SearchBar value={searchQuery} onChange={setSearchQuery} />

          {searchQuery.length >= 2 ? (
            <section className="px-4 pb-8 animate-fade-in">
              <h2 className="text-sm font-semibold text-zinc-400 mb-3">
                {searchResults.length} {searchResults.length === 1 ? 'résultat' : 'résultats'}
              </h2>
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map(({ item, category }) => (
                    <div key={`${category.id}-${item.id}`}>
                      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                        {getCategory(category.nameKey)}
                      </span>
                      <MenuItemCard
                        item={item}
                        isFavorite={isFavorite(item.id)}
                        onToggleFavorite={() => toggleFavorite(item.id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-zinc-500 py-12 text-sm">{t.ui.noResults}</p>
              )}
            </section>
          ) : (
            <>
              <div className="px-4 mb-6">
                <button
                  onClick={() => setShowSurprise(true)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500
                    text-zinc-950 font-bold text-sm active:scale-[0.97] transition-transform
                    shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <span className="text-lg">🎲</span>
                  {t.ui.surprise}
                </button>
              </div>
              <CategoryGrid onSelect={handleSelectCategory} />
            </>
          )}
        </>
      )}

      {/* CATEGORY VIEW */}
      {view === 'category' && activeCategory && (
        <div className="pt-4 animate-fade-in">
          <AllergenLegend />
          <CategoryView
            category={activeCategory}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        </div>
      )}

      {/* FAVORITES VIEW */}
      {view === 'favorites' && (
        <div className="px-4 pt-4 pb-8 animate-fade-in">
          {favoriteItems.length > 0 ? (
            <div className="space-y-2">
              {favoriteItems.map(({ item, category }) => (
                <div key={`${category.id}-${item.id}`}>
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                    {getCategory(category.nameKey)}
                  </span>
                  <MenuItemCard
                    item={item}
                    isFavorite={isFavorite(item.id)}
                    onToggleFavorite={() => toggleFavorite(item.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <span className="text-4xl block mb-4">♡</span>
              <p className="text-zinc-500 text-sm">{t.ui.noFavorites}</p>
            </div>
          )}
        </div>
      )}

      <BackToTop />
      {showSurprise && <SurpriseMe onClose={() => setShowSurprise(false)} />}
    </div>
  );
}
