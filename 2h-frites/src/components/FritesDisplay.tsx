'use client';

import { MenuItem } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import FavoriteButton from './FavoriteButton';

interface FritesDisplayProps {
  items: MenuItem[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

import { formatPrice } from '@/utils/format';

export default function FritesDisplay({ items, isFavorite, onToggleFavorite }: FritesDisplayProps) {
  const { getItemName, getSize } = useLanguage();

  const fritesItem = items.find((i) => i.sizes);
  const otherItems = items.filter((i) => !i.sizes);

  return (
    <div className="space-y-4 animate-slide-up">
      {fritesItem && (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">🍟 Frites</h3>
            <FavoriteButton
              isFavorite={isFavorite(fritesItem.id)}
              onToggle={() => onToggleFavorite(fritesItem.id)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {fritesItem.sizes!.map((size, i) => {
              const sizeIcons = ['', '', ''];
              const barHeights = ['h-10', 'h-14', 'h-20'];
              return (
                <div
                  key={size.sizeKey}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/30"
                >
                  <div className={`w-8 ${barHeights[i]} rounded-lg bg-gradient-to-t from-amber-600 to-amber-400`} />
                  <span className="text-xs font-medium text-zinc-300">{getSize(size.sizeKey)}</span>
                  <span className="text-lg font-bold text-amber-400">
                    {formatPrice(size.price)}&nbsp;€
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {otherItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50"
        >
          <div>
            <h3 className="text-sm font-semibold text-white">{getItemName(item.id, item.name)}</h3>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base font-bold text-amber-400">
              {formatPrice(item.price!)}&nbsp;{item.currency}
            </span>
            <FavoriteButton
              isFavorite={isFavorite(item.id)}
              onToggle={() => onToggleFavorite(item.id)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
