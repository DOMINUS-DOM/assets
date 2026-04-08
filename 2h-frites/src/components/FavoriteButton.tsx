'use client';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
}

export default function FavoriteButton({ isFavorite, onToggle, size = 'sm' }: FavoriteButtonProps) {
  const sizeClass = size === 'md' ? 'w-10 h-10 text-xl' : 'w-8 h-8 text-base';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`${sizeClass} flex items-center justify-center rounded-full transition-all active:scale-90
        ${isFavorite ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorite ? '♥' : '♡'}
    </button>
  );
}
