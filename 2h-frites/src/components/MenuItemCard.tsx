'use client';

import { memo } from 'react';
import { MenuItem } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';
import Badge from './Badge';
import FavoriteButton from './FavoriteButton';
import AllergenBadges from './AllergenBadges';
import AddToCartButton from './cart/AddToCartButton';

interface MenuItemCardProps {
  item: MenuItem;
  categoryId: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default memo(function MenuItemCard({ item, categoryId, isFavorite, onToggleFavorite }: MenuItemCardProps) {
  const { t, getItemName, getDescription } = useLanguage();

  const name = getItemName(item.id, item.name);
  const description = item.descriptionKey ? getDescription(item.descriptionKey) : '';

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[#EDEBE7] hover:border-[#D4D0C8] transition-colors animate-fade-in">
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h3 className="text-sm font-semibold text-[#1A1A1A] leading-tight">{name}</h3>
          {item.tags && item.tags.length > 0 && (
            <div className="flex gap-1 shrink-0 flex-wrap">
              {item.tags.map((tag) => <Badge key={tag} tag={tag} />)}
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-[#6B6B6B] mt-1.5 leading-relaxed">{description}</p>
        )}
        {item.allergens && item.allergens.length > 0 && (
          <AllergenBadges allergenIds={item.allergens} />
        )}
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {item.price != null && (
          <span className="text-sm font-bold text-[#1A1A1A] tabular-nums">{formatPrice(item.price)} €</span>
        )}
        {item.priceLabel && (
          <span className="text-xs font-medium text-[#8A8A8A] italic">{t.ui[item.priceLabel] || item.priceLabel}</span>
        )}
        {item.price != null && (
          <AddToCartButton menuItemId={item.id} name={name} price={item.price} categoryId={categoryId} />
        )}
        <FavoriteButton isFavorite={isFavorite} onToggle={onToggleFavorite} size="sm" />
      </div>
    </div>
  );
});
