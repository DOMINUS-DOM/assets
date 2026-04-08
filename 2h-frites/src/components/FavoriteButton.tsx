'use client';

import { useState } from 'react';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
}

export default function FavoriteButton({ isFavorite, onToggle, size = 'sm' }: FavoriteButtonProps) {
  const [burst, setBurst] = useState(false);
  const sizeClass = size === 'md' ? 'w-10 h-10 text-xl' : 'w-8 h-8 text-base';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFavorite) {
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    onToggle();
  };

  return (
    <button
      onClick={handleClick}
      className={`${sizeClass} relative flex items-center justify-center rounded-full transition-all
        ${isFavorite ? 'text-red-500 scale-110' : 'text-zinc-500 hover:text-zinc-300'}
        active:scale-75`}
      style={{ transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s' }}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <span className={isFavorite ? 'inline-block animate-heartPop' : ''}>
        {isFavorite ? '♥' : '♡'}
      </span>
      {burst && (
        <>
          {['top-0 left-1/2 -translate-x-1/2 -translate-y-2', 'bottom-0 left-1/2 -translate-x-1/2 translate-y-2',
            'left-0 top-1/2 -translate-y-1/2 -translate-x-2', 'right-0 top-1/2 -translate-y-1/2 translate-x-2',
            'top-0 left-0 -translate-x-1 -translate-y-1', 'top-0 right-0 translate-x-1 -translate-y-1',
          ].map((pos, i) => (
            <span
              key={i}
              className={`absolute ${pos} text-red-400 animate-particle pointer-events-none`}
              style={{ animationDelay: `${i * 40}ms`, fontSize: '8px' }}
            >
              ♥
            </span>
          ))}
        </>
      )}
    </button>
  );
}
