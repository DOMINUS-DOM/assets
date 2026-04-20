'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { menuStore } from '@/stores/menuStore';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSearch } from '@/hooks/useSearch';
import { useFavorites } from '@/hooks/useFavorites';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SearchBar from '@/components/SearchBar';
import MobileFlatMenu from '@/components/MobileFlatMenu';
import CategoryView from '@/components/CategoryView';
import MenuItemCard from '@/components/MenuItemCard';
import BackToTop from '@/components/BackToTop';
import FloatingCartBar from '@/components/cart/FloatingCartBar';
import AllergenLegend from '@/components/AllergenLegend';
import PlatformLanding from '@/components/PlatformLanding';
import { useTenant, useIsDemo } from '@/contexts/TenantContext';
import Onboarding from '@/components/Onboarding';
import DemoIntro from '@/components/DemoIntro';
import NotificationPrompt from '@/components/NotificationPrompt';
import PainFritesBuilder from '@/components/PainFritesBuilder';
import { useCart } from '@/contexts/CartContext';

type View = 'home' | 'category' | 'favorites';

export default function HomePage() {
  const { isPlatform } = useTenant();

  // Platform landing — rendered in a separate branch to avoid hook count mismatch
  if (isPlatform) return <PlatformLanding />;

  return <MenuPage />;
}

function MenuPage() {
  const { locale, t, getCategory } = useLanguage();
  const { isFavorite, toggleFavorite, count: favCount } = useFavorites();
  const { addItem } = useCart();
  const { tenant, loading: tenantLoading } = useTenant();
  const isDemo = useIsDemo();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDemoIntro, setShowDemoIntro] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>('home');
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [categories, setCategories] = useState(menuStore.getCategories());

  useEffect(() => menuStore.subscribe(() => setCategories(menuStore.getCategories())), []);

  const searchResults = useSearch(searchQuery, locale);

  const activeCategory = useMemo(
    () => (activeSlug ? categories.find((c) => c.slug === activeSlug) || null : null),
    [activeSlug, categories]
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
    // Wait until tenant data has loaded so `isDemo` is final — avoids the
    // 7-step Onboarding flashing on demo tenants during the initial render.
    if (tenantLoading) return;
    try {
      if (isDemo) {
        const seen = localStorage.getItem('brizo-demo-intro-seen');
        if (!seen) setShowDemoIntro(true);
        setShowOnboarding(false);
      } else {
        const done = localStorage.getItem('2h-onboarded');
        if (!done) setShowOnboarding(true);
        setShowDemoIntro(false);
      }
    } catch {}
    setReady(true);
  }, [isDemo, tenantLoading]);

  const handleOnboardingComplete = useCallback((selectedCategory?: string) => {
    try { localStorage.setItem('2h-onboarded', 'true'); } catch {}
    setShowOnboarding(false);
    if (selectedCategory) {
      // Navigate to the selected category from onboarding
      setTimeout(() => handleSelectCategory(selectedCategory), 100);
    }
  }, []);

  const handleReplayTutorial = useCallback(() => {
    if (isDemo) setShowDemoIntro(true);
    else setShowOnboarding(true);
  }, [isDemo]);

  const handleDemoIntroDone = useCallback(() => {
    try { localStorage.setItem('brizo-demo-intro-seen', '1'); } catch {}
    setShowDemoIntro(false);
  }, []);

  const handleSelectCategory = useCallback((slug: string) => {
    const cat = categories.find((c) => c.slug === slug);
    if (cat?.builder) {
      setShowBuilder(true);
      return;
    }
    setActiveSlug(slug);
    setView('category');
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [categories]);

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

  if (showDemoIntro) {
    return <DemoIntro onStart={handleDemoIntroDone} />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto pb-20">
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
          {isDemo && (
            <div className="px-4 mb-5">
              <div className="rounded-2xl border border-[#EDEBE7] bg-white px-4 py-3.5">
                <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#F59E0B] mb-1.5">Démo Brizo</p>
                <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                  Ce restaurant est utilisé pour tester Brizo en conditions réelles. Chaque semaine,
                  l'outil évolue grâce aux retours des restaurateurs.
                </p>
                <a
                  href="https://brizoapp.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1A1A1A] hover:opacity-70 transition-opacity"
                >
                  Créer mon restaurant en 10 minutes <span>→</span>
                </a>
              </div>
            </div>
          )}
          <SearchBar value={searchQuery} onChange={setSearchQuery} />

          {searchQuery.length >= 2 ? (
            <section className="px-4 pb-8 animate-fade-in">
              <h2 className="text-sm font-semibold text-zinc-400 mb-3">
                {searchResults.length} {t.ui.results}
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
                        categoryId={category.id}
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
            <div className="px-4">
              <MobileFlatMenu categories={categories} onSelectCategory={handleSelectCategory} />
            </div>
          )}

          {isDemo && searchQuery.length < 2 && (
            <section className="px-4 mt-10 mb-10">
              <div className="rounded-2xl border border-[#EDEBE7] bg-white p-5">
                <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#F59E0B] mb-2">Vous êtes restaurateur ?</p>
                <h3 className="text-[18px] font-bold text-[#1A1A1A] tracking-tight mb-3">Créez votre propre restaurant en 10 minutes</h3>
                <ul className="space-y-2 mb-4 text-[14px] text-[#1A1A1A]">
                  <li className="flex gap-2.5"><span className="text-[#F59E0B] shrink-0">✓</span> Menu en ligne en quelques minutes</li>
                  <li className="flex gap-2.5"><span className="text-[#F59E0B] shrink-0">✓</span> Commandes reçues immédiatement</li>
                  <li className="flex gap-2.5"><span className="text-[#F59E0B] shrink-0">✓</span> 100 % de vos marges, zéro commission</li>
                </ul>
                <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-4">
                  Besoin de plus ? Nous pouvons adapter Brizo à votre restaurant — fonctionnalités, intégrations, accompagnement.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href="https://brizoapp.com/signup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-5 py-3 rounded-xl bg-[#1A1A1A] text-white font-semibold text-[14px] hover:bg-black transition-colors"
                  >
                    Créer mon restaurant
                  </a>
                  <a
                    href="https://calendly.com/brizoapp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-5 py-3 rounded-xl border border-[#EDEBE7] text-[#1A1A1A] font-semibold text-[14px] hover:border-[#1A1A1A]/30 transition-colors"
                  >
                    Parler au fondateur
                  </a>
                </div>
              </div>
            </section>
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
                    categoryId={category.id}
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
      <FloatingCartBar />
      {showBuilder && <PainFritesBuilder onClose={() => setShowBuilder(false)} onAdd={(item) => addItem(item)} />}
      <NotificationPrompt />
    </div>
  );
}
