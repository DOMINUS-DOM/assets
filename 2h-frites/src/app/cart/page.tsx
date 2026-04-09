'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/format';
import CartItemRow from '@/components/cart/CartItemRow';

export default function CartPage() {
  const { items, total, count, clearCart } = useCart();

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="flex items-center gap-1 text-amber-400 font-medium text-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Menu
          </Link>
          <h1 className="text-sm font-bold text-white">Panier ({count})</h1>
          {items.length > 0 && (
            <button onClick={clearCart} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
              Vider
            </button>
          )}
        </div>
      </header>

      <div className="px-4 pt-4">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">🛒</span>
            <p className="text-zinc-400 text-sm mb-6">Votre panier est vide</p>
            <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm">
              Voir le menu
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-6">
              {items.map((item) => (
                <CartItemRow key={`${item.menuItemId}-${item.sizeKey || ''}`} item={item} />
              ))}
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Total</span>
                <span className="text-2xl font-extrabold text-amber-400">{formatPrice(total)} €</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="block w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500
                text-zinc-950 font-bold text-center text-sm active:scale-[0.97] transition-transform
                shadow-lg shadow-amber-500/20"
            >
              Commander ({formatPrice(total)} €)
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
