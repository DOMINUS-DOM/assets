'use client';

import { useState, useEffect } from 'react';
import { menuStore } from '@/stores/menuStore';
import { formatPrice } from '@/utils/format';

export default function DisplayMenuPage() {
  const [categories, setCategories] = useState(menuStore.getCategories());
  const [activeIndex, setActiveIndex] = useState(0);
  const [time, setTime] = useState(new Date());

  useEffect(() => { return menuStore.subscribe(() => setCategories(menuStore.getCategories())); }, []);

  // Rotate categories every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % categories.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [categories.length]);

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const cat = categories[activeIndex];
  if (!cat) return null;

  const availableItems = cat.items.filter((i) => !i.unavailable);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <span className="text-4xl">🍟</span>
          <div>
            <h1 className="text-2xl font-extrabold"><span className="text-amber-400">2H</span> Frites Artisanales</h1>
            <p className="text-xs text-zinc-500">Les Deux Haine</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-amber-400 tabular-nums">
            {time.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs text-zinc-500">{time.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {/* Category header */}
      <div className="px-8 py-4 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{cat.icon}</span>
          <div>
            <h2 className="text-3xl font-extrabold text-white">{cat.nameKey}</h2>
            <p className="text-sm text-zinc-400">{availableItems.length} articles</p>
          </div>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5 mt-3">
          {categories.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === activeIndex ? 'w-8 bg-amber-400' : 'w-2 bg-zinc-700'}`} />
          ))}
        </div>
      </div>

      {/* Items grid */}
      <div className="flex-1 overflow-hidden px-8 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full content-start">
          {availableItems.slice(0, 16).map((item, i) => (
            <div key={item.id}
              className="flex items-center justify-between px-5 py-4 rounded-xl bg-zinc-900 border border-zinc-800/50 animate-fade-in"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'backwards' }}>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-white truncate">{item.name}</p>
                {item.tags?.map((tag) => (
                  <span key={tag} className="text-[10px] mr-1">
                    {tag === 'popular' ? '⭐' : tag === 'spicy' ? '🌶️' : tag === 'vegetarian' ? '🌿' : tag === 'new' ? '✨' : ''}
                  </span>
                ))}
              </div>
              {item.price != null && (
                <span className="text-xl font-extrabold text-amber-400 ml-3 shrink-0">
                  {formatPrice(item.price)} €
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom promo bar */}
      <div className="px-8 py-3 bg-amber-500 text-zinc-950 text-center">
        <p className="text-lg font-bold animate-pulse">
          🎁 Commandez en ligne sur 2hfrites.be — Retrait ou livraison ! 🛵
        </p>
      </div>
    </div>
  );
}
