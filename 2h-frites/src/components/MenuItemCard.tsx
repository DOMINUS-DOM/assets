'use client';

import { memo } from 'react';
import { MenuItem } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';
import Badge from './Badge';
import FavoriteButton from './FavoriteButton';
import AllergenBadges from './AllergenBadges';

interface MenuItemCardProps {
  item: MenuItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default memo(function MenuItemCard({ item, isFavorite, onToggleFavorite }: MenuItemCardProps) {
  const { t, getItemName, getDescription } = useLanguage();

  const name = getItemName(item.id, item.name);
  const description = item.descriptionKey ? getDescription(item.descriptionKey) : '';

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800/50
      hover:border-zinc-700 transition-colors animate-fade-in">
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h3 className="text-sm font-semibold text-white leading-tight">{name}</h3>
          {item.tags && item.tags.length > 0 && (
            <div className="flex gap-1 shrink-0 flex-wrap">
              {item.tags.map((tag) => (
                <Badge key={tag} tag={tag} />
              ))}
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{description}</p>
        )}
        {item.allergens && item.allergens.length > 0 && (
          <AllergenBadges allergenIds={item.allergens} />
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {item.price != null && (
          <span className="text-base font-bold text-amber-400">
            {formatPrice(item.price)}&nbsp;{item.currency}
          </span>
        )}
        {item.priceLabel && (
          <span className="text-xs font-medium text-zinc-400 italic">
            {t.ui[item.priceLabel] || item.priceLabel}
          </span>
        )}
        <FavoriteButton isFavorite={isFavorite} onToggle={onToggleFavorite} />
      </div>
    </div>
  );
});
