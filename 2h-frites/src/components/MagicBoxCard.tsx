'use client';

import { MenuItem } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import Badge from './Badge';
import FavoriteButton from './FavoriteButton';

interface MagicBoxCardProps {
  items: MenuItem[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

function formatPrice(price: number): string {
  return price.toFixed(2).replace('.', ',');
}

export default function MagicBoxCard({ items, isFavorite, onToggleFavorite }: MagicBoxCardProps) {
  const { getItemName, getDescription } = useLanguage();

  return (
    <div className="space-y-4 animate-slide-up">
      {items.map((item) => (
        <div
          key={item.id}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-900
            border border-amber-500/20 p-5"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🎁</span>
                  <h3 className="text-lg font-bold text-white">{getItemName(item.id, item.name)}</h3>
                </div>
                {item.tags?.map((tag) => <Badge key={tag} tag={tag} />)}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-extrabold text-amber-400">
                  {formatPrice(item.price!)}&nbsp;€
                </span>
                <FavoriteButton
                  isFavorite={isFavorite(item.id)}
                  onToggle={() => onToggleFavorite(item.id)}
                />
              </div>
            </div>
            {item.descriptionKey && (
              <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-800/50 rounded-lg px-3 py-2">
                {getDescription(item.descriptionKey)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
