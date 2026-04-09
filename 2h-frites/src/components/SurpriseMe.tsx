'use client';

import { useState, useEffect, useCallback } from 'react';
import { menuStore } from '@/stores/menuStore';
import { useLanguage } from '@/i18n/LanguageContext';
import { MenuItem, Category } from '@/types';

const EMOJIS = ['🍟', '🍔', '🥩', '🌭', '🥖', '🔥', '🥗', '🎁'];

const FOOD_CATEGORIES = ['frites', 'magic_box', 'viandes', 'pains_ronds', 'assiettes', 'grillades', 'sandwichs', 'salades'];

interface SurpriseMeProps {
  onClose: () => void;
}

export default function SurpriseMe({ onClose }: SurpriseMeProps) {
  const { t, getItemName, getCategory, getDescription } = useLanguage();
  const [phase, setPhase] = useState<'spinning' | 'reveal'>('spinning');
  const [emojiIndex, setEmojiIndex] = useState(0);
  const [pick, setPick] = useState<{ item: MenuItem; category: Category } | null>(null);

  const pickRandom = useCallback(() => {
    const foodItems = menuStore.getCategories()
      .filter((cat) => FOOD_CATEGORIES.includes(cat.id))
      .flatMap((cat) =>
        cat.items.filter((i) => i.price != null).map((item) => ({ item, category: cat }))
      );
    return foodItems[Math.floor(Math.random() * foodItems.length)];
  }, []);

  useEffect(() => {
    setPick(pickRandom());
    const interval = setInterval(() => {
      setEmojiIndex((i) => (i + 1) % EMOJIS.length);
    }, 80);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setPhase('reveal');
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [pickRandom]);

  const handleRetry = () => {
    setPhase('spinning');
    setPick(pickRandom());
    setEmojiIndex(0);

    const interval = setInterval(() => {
      setEmojiIndex((i) => (i + 1) % EMOJIS.length);
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      setPhase('reveal');
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-zinc-900 rounded-3xl border border-zinc-700 p-6 text-center animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'spinning' && (
          <div className="py-8">
            <div className="text-7xl animate-bounce mb-4">{EMOJIS[emojiIndex]}</div>
            <p className="text-lg font-bold text-amber-400 animate-pulse">
              {t.ui.surpriseSpinning}
            </p>
          </div>
        )}

        {phase === 'reveal' && pick && (
          <div className="animate-scale-in">
            <div className="text-5xl mb-3">{pick.category.icon}</div>
            <p className="text-xs font-medium text-amber-400/70 uppercase tracking-wider mb-1">
              {getCategory(pick.category.nameKey)}
            </p>
            <h3 className="text-xl font-bold text-white mb-2">
              {getItemName(pick.item.id, pick.item.name)}
            </h3>
            {pick.item.descriptionKey && (
              <p className="text-sm text-zinc-400 mb-3">
                {getDescription(pick.item.descriptionKey)}
              </p>
            )}
            <div className="text-3xl font-extrabold text-amber-400 mb-6">
              {pick.item.price!.toFixed(2).replace('.', ',')} €
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-semibold
                  active:scale-95 transition-transform"
              >
                🎲 {t.ui.surpriseRetry}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-zinc-950 font-semibold
                  active:scale-95 transition-transform"
              >
                👍 {t.ui.surpriseNice}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
