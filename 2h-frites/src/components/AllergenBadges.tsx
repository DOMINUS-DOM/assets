'use client';

import { memo } from 'react';
import { ALLERGENS } from '@/data/allergens';
import { useLanguage } from '@/i18n/LanguageContext';

interface AllergenBadgesProps {
  allergenIds: number[];
  compact?: boolean;
}

export default memo(function AllergenBadges({ allergenIds, compact = false }: AllergenBadgesProps) {
  const { t } = useLanguage();

  if (!allergenIds || allergenIds.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-0.5 mt-1">
        {allergenIds.map((id) => (
          <span
            key={id}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full
              bg-orange-500/15 text-orange-300 text-[10px] font-bold"
            title={t.allergens[ALLERGENS[id - 1]?.key] || ''}
          >
            {id}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {allergenIds.map((id) => {
        const allergen = ALLERGENS[id - 1];
        if (!allergen) return null;
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
              bg-orange-500/10 text-orange-300/80 text-[10px] font-medium"
          >
            <span className="font-bold">{id}</span>
            <span className="hidden min-[400px]:inline">{allergen.icon}</span>
          </span>
        );
      })}
    </div>
  );
});
