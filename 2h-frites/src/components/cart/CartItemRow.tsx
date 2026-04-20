'use client';

import { CartItem } from '@/types/order';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/format';

export default function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-[#EDEBE7]">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1A1A1A] truncate">
          {item.name}
          {item.sizeKey && <span className="text-[#8A8A8A] font-normal ml-1">({item.sizeKey})</span>}
        </p>
        {item.extras && item.extras.length > 0 && (
          <div className="mt-0.5">
            {item.extras.map((ex, i) => (
              <p key={i} className="text-[11px] text-[#8A8A8A]">└ {ex.name} +{formatPrice(ex.price)} €</p>
            ))}
          </div>
        )}
        <p className="text-xs text-[#8A8A8A] tabular-nums">{formatPrice(item.price)} € × {item.quantity}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => updateQuantity(item.menuItemId, item.quantity - 1, item.sizeKey, item.extras)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5F3EF] text-[#1A1A1A] border border-[#EDEBE7] active:scale-90 transition-transform text-sm font-bold"
        >
          −
        </button>
        <span className="text-sm font-bold text-[#1A1A1A] w-6 text-center tabular-nums">{item.quantity}</span>
        <button
          onClick={() => updateQuantity(item.menuItemId, item.quantity + 1, item.sizeKey, item.extras)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F5F3EF] text-[#1A1A1A] border border-[#EDEBE7] active:scale-90 transition-transform text-sm font-bold"
        >
          +
        </button>
      </div>

      <div className="text-right shrink-0 w-16">
        <p className="text-sm font-bold text-[#1A1A1A] tabular-nums">{formatPrice(item.price * item.quantity)} €</p>
      </div>

      <button
        onClick={() => removeItem(item.menuItemId, item.sizeKey, item.extras)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:text-red-600 transition-colors active:scale-90 text-xs"
        aria-label="Remove"
      >
        ✕
      </button>
    </div>
  );
}
