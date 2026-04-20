'use client';

import { useState } from 'react';
import { Category, MenuItem } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import MenuItemCard from './MenuItemCard';
import FritesDisplay from './FritesDisplay';
import MagicBoxCard from './MagicBoxCard';
import SauceGrid from './SauceGrid';
import Badge from './Badge';
import PainRondBuilder from './PainRondBuilder';

interface CategoryViewProps {
  category: Category;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

export default function CategoryView({ category, isFavorite, onToggleFavorite }: CategoryViewProps) {
  const { t, getCategory, getSubcategory, getItemName } = useLanguage();
  const { addItem } = useCart();
  const [vegFilter, setVegFilter] = useState(false);
  const [builderItem, setBuilderItem] = useState<MenuItem | null>(null);

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

  if (category.slug === 'pains-ronds' || category.slug === 'grillades') {
    return (
      <div className="px-4 pb-8">
        <p className="text-xs text-[#8A8A8A] mb-4">Cliquez pour personnaliser avec sauces et garnitures.</p>
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <button key={item.id} onClick={() => setBuilderItem(item)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-white border border-[#EDEBE7] hover:border-[#D4D0C8] transition-colors text-left active:scale-[0.98]">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1A1A]">{getItemName(item.id, item.name)}</p>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">{item.tags.map((tag) => <Badge key={tag} tag={tag} />)}</div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.price != null && (
                  <span className="text-sm font-bold text-[#1A1A1A] tabular-nums">{item.price.toFixed(2)} €</span>
                )}
                <span className="text-[#8A8A8A] text-lg">→</span>
              </div>
            </button>
          ))}
        </div>
        {builderItem && <PainRondBuilder item={builderItem} onClose={() => setBuilderItem(null)} onAdd={(item) => addItem(item)} />}
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
              <h3 className="text-sm font-bold text-brand-light uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-8 h-px bg-brand/30" />
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
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-white border border-[#EDEBE7]">
          <span className="text-[#F59E0B] text-sm">ℹ️</span>
          <span className="text-sm text-[#6B6B6B]">{t.ui[category.note]}</span>
        </div>
      )}

      {/* Vegetarian filter */}
      {hasVegetarianItems && (
        <button
          onClick={() => setVegFilter(!vegFilter)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4
            transition-colors active:scale-95 ${
              vegFilter
                ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                : 'bg-white text-[#6B6B6B] border border-[#EDEBE7]'
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
