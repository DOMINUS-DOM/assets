'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';

export default function CartButton() {
  const { count } = useCart();

  return (
    <Link
      href="/cart"
      className="relative w-10 h-10 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors active:scale-95"
      aria-label="Cart"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center
          rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold px-1">
          {count}
        </span>
      )}
    </Link>
  );
}
