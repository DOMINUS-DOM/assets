'use client';

import { useState } from 'react';
import { Category } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import MenuItemCard from './MenuItemCard';
import FritesDisplay from './FritesDisplay';
import MagicBoxCard from './MagicBoxCard';
import SauceGrid from './SauceGrid';
import Badge from './Badge';

interface CategoryViewProps {
  category: Category;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

export default function CategoryView({ category, isFavorite, onToggleFavorite }: CategoryViewProps) {
  const { t, getCategory, getSubcategory, getItemName } = useLanguage();
  const [vegFilter, setVegFilter] = useState(false);

  const hasVegetarianItems = category.items.some((i) => i.tags?.includes('vegetarian'));

  const filteredItems = vegFilter
    ? category.items.filter((i) => i.tags?.includes('vegetarian'))
    : category.items;

  // Special displays per category type
  if (category.slug === 'frites') {
    return (
      <div className="px-4 pb-8">
        <FritesDisplay items={category.items} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
      </div>
    );
  }

  if (category.slug === 'magic-box') {
    return (
      <div className="px-4 pb-8">
        <MagicBoxCard items={category.items} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
      </div>
    );
  }

  if (category.slug === 'sauces') {
    return (
      <div className="px-4 pb-8">
        <SauceGrid category={category} />
      </div>
    );
  }

  // Drinks with subcategories
  if (category.subcategories && category.subcategories.length > 0) {
    return (
      <div className="px-4 pb-8 space-y-6 animate-slide-up">
        {category.subcategories.map((sub) => {
          const subItems = filteredItems.filter((i) => i.subcategory === sub);
          if (subItems.length === 0) return null;
          return (
            <div key={sub}>
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-8 h-px bg-amber-500/30" />
                {getSubcategory(sub)}
              </h3>
              <div className="space-y-2">
                {subItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    categoryId={category.id}
                    isFavorite={isFavorite(item.id)}
                    onToggleFavorite={() => onToggleFavorite(item.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Default list with optional vegetarian filter
  return (
    <div className="px-4 pb-8">
      {/* Note for supplements */}
      {category.note && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <span className="text-amber-400 text-sm">ℹ️</span>
          <span className="text-sm text-zinc-400">{t.ui[category.note]}</span>
        </div>
      )}

      {/* Vegetarian filter */}
      {hasVegetarianItems && (
        <button
          onClick={() => setVegFilter(!vegFilter)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4
            transition-colors active:scale-95 ${
              vegFilter
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
        >
          <span>🌿</span>
          {t.ui.vegetarianFilter}
          {vegFilter && <span className="ml-1">✓</span>}
        </button>
      )}

      <div className="space-y-2">
        {filteredItems.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            categoryId={category.id}
            isFavorite={isFavorite(item.id)}
            onToggleFavorite={() => onToggleFavorite(item.id)}
          />
        ))}
      </div>

      {filteredItems.length === 0 && (
        <p className="text-center text-zinc-500 py-8 text-sm">{t.ui.noResults}</p>
      )}
    </div>
  );
}
