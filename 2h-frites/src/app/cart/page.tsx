'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useIsDemo } from '@/contexts/TenantContext';
import { formatPrice } from '@/utils/format';
import CartItemRow from '@/components/cart/CartItemRow';

export default function CartPage() {
  const { items, total, count, clearCart } = useCart();
  const { t } = useLanguage();
  const isDemo = useIsDemo();

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-[#FAFAF8] text-[#1A1A1A]">
      <header className="sticky top-0 z-40 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#EDEBE7]">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="flex items-center gap-1 text-[#1A1A1A] font-medium text-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Menu
          </Link>
          <h1 className="text-sm font-bold text-[#1A1A1A]">{t.ui.cart_title} ({count})</h1>
          {items.length > 0 && (
            <button onClick={clearCart} className="text-xs text-[#8A8A8A] hover:text-red-600 transition-colors">
              {t.ui.cart_clear}
            </button>
          )}
        </div>
      </header>

      <div className="px-4 pt-4">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">🛒</span>
            <p className="text-[#6B6B6B] text-sm mb-6">{t.ui.cart_empty}</p>
            <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-[#1A1A1A] text-white font-semibold text-sm hover:bg-black">
              {t.ui.cart_seeMenu}
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-6">
              {items.map((item) => (
                <CartItemRow key={`${item.menuItemId}-${item.sizeKey || ''}`} item={item} />
              ))}
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#EDEBE7] mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#6B6B6B]">{t.ui.cart_total}</span>
                <span className="text-2xl font-extrabold text-[#1A1A1A] tabular-nums">{formatPrice(total)} €</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="block w-full py-4 rounded-2xl bg-[#1A1A1A] text-white font-semibold text-center text-[15px] active:scale-[0.98] transition-transform hover:bg-black"
            >
              {t.ui.cart_order} ({formatPrice(total)} €)
            </Link>
            {isDemo && count > 0 && (
              <div className="mt-5 rounded-2xl border border-[#EDEBE7] bg-white px-4 py-4">
                <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#F59E0B] mb-1.5">Test réussi</p>
                <p className="text-[14px] text-[#1A1A1A] leading-snug mb-3">
                  Vous venez de tester Brizo en conditions réelles. Créez votre restaurant — en 10 minutes.
                </p>
                <a
                  href="https://brizoapp.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1A1A1A] underline underline-offset-4 decoration-[#D4D0C8] hover:decoration-[#1A1A1A]"
                >
                  Créer le mien <span>→</span>
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
