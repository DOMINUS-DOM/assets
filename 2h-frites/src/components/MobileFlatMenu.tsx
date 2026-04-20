'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/format';
import { getCloudinaryUrl } from '@/lib/cloudinaryUrl';
import type { Category, MenuItem } from '@/types';

interface Props {
  categories: Category[];
  onSelectCategory: (slug: string) => void;
}

/**
 * Mobile-first flat menu. Light theme: white cards on warm off-white bg,
 * sticky black-pill category nav, Wolt-style circular add button.
 * Tapping a card with a builder flag or size variants delegates to the
 * legacy detail flow so the user picks a variant before the cart hits.
 */
export default function MobileFlatMenu({ categories, onSelectCategory }: Props) {
  const { getCategory, getItemName, getDescription } = useLanguage();
  const { addItem } = useCart();
  const [activeSlug, setActiveSlug] = useState<string | null>(categories[0]?.slug || null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const visibleCategories = useMemo(
    () => categories.filter((c) => c.items.length > 0),
    [categories]
  );

  useEffect(() => {
    if (visibleCategories.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          const slug = (visible.target as HTMLElement).dataset.slug;
          if (slug) {
            setActiveSlug(slug);
            const pill = pillRefs.current[slug];
            if (pill) pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }
      },
      { rootMargin: '-120px 0px -50% 0px', threshold: 0 }
    );
    visibleCategories.forEach((c) => {
      const el = sectionRefs.current[c.slug];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [visibleCategories]);

  const handlePill = useCallback((slug: string) => {
    setActiveSlug(slug);
    const el = sectionRefs.current[slug];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  const handleCardClick = useCallback(
    (cat: Category, item: MenuItem) => {
      if (cat.builder || (item.sizes && item.sizes.length > 0)) {
        onSelectCategory(cat.slug);
        return;
      }
      if (item.price != null) {
        addItem({ menuItemId: item.id, name: getItemName(item.id, item.name), price: item.price, categoryId: cat.id });
      }
    },
    [addItem, getItemName, onSelectCategory]
  );

  if (visibleCategories.length === 0) {
    return <p className="text-center text-[#8A8A8A] py-16 text-sm">Aucun article disponible.</p>;
  }

  return (
    <div className="pb-24">
      {/* Sticky category pills — stacked emoji + label, generous tap target.
          Only horizontal scroll on the page belongs here. */}
      <nav
        className="sticky top-16 z-20 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#EDEBE7] -mx-4 px-4"
        aria-label="Catégories"
      >
        <div className="flex gap-2.5 overflow-x-auto py-3.5 scrollbar-hide">
          {visibleCategories.map((c) => {
            const active = activeSlug === c.slug;
            const catPhoto = getCloudinaryUrl(c.imageUrl, 'category-pill');
            return (
              <button
                key={c.slug}
                ref={(el) => { pillRefs.current[c.slug] = el; }}
                onClick={() => handlePill(c.slug)}
                className={`shrink-0 flex flex-col items-center justify-center min-w-[86px] px-3.5 py-2.5 rounded-2xl transition-all duration-150 active:scale-95 ${
                  active
                    ? 'bg-[#1A1A1A] text-white shadow-[0_4px_12px_-4px_rgba(0,0,0,0.25)]'
                    : 'bg-white text-[#1A1A1A] border border-[#EDEBE7] hover:border-[#1A1A1A]/30'
                }`}
              >
                {catPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={catPhoto} alt="" className="w-7 h-7 rounded-full object-cover mb-1 ring-2 ring-white/0" />
                ) : (
                  <span className="text-[26px] leading-none mb-1">{c.icon}</span>
                )}
                <span className={`text-[11px] font-semibold tracking-tight leading-tight text-center line-clamp-1 ${active ? '' : 'text-[#6B6B6B]'}`}>
                  {getCategory(c.nameKey)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sections — one per category */}
      <div className="space-y-8 pt-5">
        {visibleCategories.map((cat) => (
          <section
            key={cat.slug}
            ref={(el) => { sectionRefs.current[cat.slug] = el; }}
            data-slug={cat.slug}
            className="scroll-mt-32"
          >
            <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-3 px-1">
              <span className="mr-2">{cat.icon}</span>
              {getCategory(cat.nameKey)}
            </h2>
            <div className="space-y-3">
              {cat.items
                .filter((i) => !i.unavailable)
                .map((item) => {
                  const name = getItemName(item.id, item.name);
                  const description = item.descriptionKey ? getDescription(item.descriptionKey) : '';
                  const price = item.price ?? null;
                  const photoUrl = getCloudinaryUrl(item.imageUrl, 'menu-card');
                  const hasImage = !!photoUrl;
                  const needsBuilder = cat.builder || (item.sizes && item.sizes.length > 0);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleCardClick(cat, item)}
                      className="w-full text-left flex items-center gap-4 p-4 rounded-2xl bg-white border border-[#EDEBE7] hover:border-[#D4D0C8] active:scale-[0.98] transition-all duration-150"
                    >
                      {/* Image LEFT when present — Uber Eats / Glovo pattern.
                          Items without a photo skip the slot entirely (no cheap
                          placeholder) and the content slides flush to the left. */}
                      {hasImage && photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoUrl} alt={name} loading="lazy" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] font-semibold text-[#1A1A1A] leading-snug tracking-tight">{name}</h3>
                        {description && (
                          <p className="text-[12.5px] text-[#8A8A8A] mt-1 leading-snug line-clamp-2">{description}</p>
                        )}
                        {price != null && (
                          <p className="text-[17px] font-extrabold text-[#1A1A1A] tabular-nums mt-1.5">
                            {needsBuilder && <span className="text-[11px] text-[#8A8A8A] font-medium mr-1.5 uppercase tracking-wide">dès</span>}
                            {formatPrice(price)} €
                          </p>
                        )}
                      </div>

                      {/* Add affordance — right-aligned, vertically centered.
                          Whole card is the click target so this stays a visual cue. */}
                      <span
                        role="presentation"
                        aria-hidden
                        className="pointer-events-none inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1A1A1A] text-white text-[24px] font-semibold leading-none shrink-0 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35)]"
                      >
                        +
                      </span>
                    </button>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
