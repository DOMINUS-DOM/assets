'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/format';

/**
 * Sticky bottom pill showing current cart state. Hidden when cart is empty
 * so it never competes for attention on an empty menu. Respects the iOS
 * safe-area (notch + home indicator).
 */
export default function FloatingCartBar() {
  const { count, total } = useCart();
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
      <div
        className="px-4 pt-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        <Link
          href="/cart"
          className="pointer-events-auto mx-auto max-w-[420px] flex items-center justify-between gap-4 px-5 py-3.5 rounded-full bg-[#1A1A1A] text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] active:scale-[0.99] transition-transform"
        >
          <span className="inline-flex items-center gap-2 text-[14px] font-semibold">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/15 text-[12px] tabular-nums">{count}</span>
            <span>{count > 1 ? 'articles' : 'article'}</span>
          </span>
          <span className="text-[14px] font-bold tabular-nums">{formatPrice(total)} €</span>
          <span className="text-[14px] font-semibold">Voir le panier →</span>
        </Link>
      </div>
    </div>
  );
}
