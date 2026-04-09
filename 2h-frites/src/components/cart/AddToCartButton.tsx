'use client';

import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';

interface Props {
  menuItemId: string;
  name: string;
  price: number;
  categoryId: string;
  sizeKey?: string;
}

export default function AddToCartButton({ menuItemId, name, price, categoryId, sizeKey }: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({ menuItemId, name, price, categoryId, sizeKey });
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  return (
    <button
      onClick={handleAdd}
      className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold
        transition-all active:scale-90 shrink-0
        ${added ? 'bg-emerald-500 text-white scale-110' : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'}`}
      aria-label="Add to cart"
    >
      {added ? '✓' : '+'}
    </button>
  );
}
