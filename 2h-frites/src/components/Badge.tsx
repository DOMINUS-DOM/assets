'use client';

import { memo } from 'react';
import { Tag } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';

const tagConfig: Record<Tag, { bg: string; text: string; icon: string }> = {
  popular: { bg: 'bg-brand/20', text: 'text-brand-light', icon: '★' },
  vegetarian: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: '🌿' },
  spicy: { bg: 'bg-red-500/20', text: 'text-red-400', icon: '🌶️' },
  new: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '✦' },
};

export default memo(function Badge({ tag }: { tag: Tag }) {
  const { t } = useLanguage();
  const config = tagConfig[tag];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className="text-[10px]">{config.icon}</span>
      {t.ui[tag]}
    </span>
  );
});
