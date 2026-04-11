'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { menuStore } from '@/stores/menuStore';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';
import { Category, MenuItem, Locale } from '@/types';
import { CartExtra } from '@/types/order';
import PainFritesBuilder from '@/components/PainFritesBuilder';
import PainRondBuilder from '@/components/PainRondBuilder';
import MagicBoxBuilder from '@/components/MagicBoxBuilder';

// ─── Types ───
interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  sizeKey?: string;
  categoryId: string;
  extras?: CartExtra[];
}

type KioskStep = 'welcome' | 'orderType' | 'menu' | 'cart' | 'confirm';
const IDLE_TIMEOUT = 90000; // 90s inactivity

const LANGS: { code: Locale; flag: string; label: string }[] = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'nl', flag: '🇳🇱', label: 'Nederlands' },
];

// ═══════════════════════════════════════════
// MAIN KIOSK COMPONENT
// ═══════════════════════════════════════════

function KioskContent() {
  const { t, locale, setLocale, getCategory, getItemName } = useLanguage();
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get('table');

  const [step, setStep] = useState<KioskStep>('welcome');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sizePopup, setSizePopup] = useState<MenuItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load menu
  useEffect(() => {
    const load = () => {
      const cats = menuStore.getCategories().filter((c) => c.items.length > 0 || c.builder);
      setCategories(cats);
    };
    load();
    return menuStore.subscribe(load);
  }, []);

  // Idle timer
  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (step !== 'welcome' && step !== 'confirm') {
      idleTimer.current = setTimeout(() => {
        setStep('welcome');
        setCart([]);
        setActiveCatId(null);
        setOrderType('dine_in');
      }, IDLE_TIMEOUT);
    }
  }, [step]);

  useEffect(() => {
    resetIdle();
    const handler = () => resetIdle();
    window.addEventListener('touchstart', handler, { passive: true });
    window.addEventListener('click', handler);
    return () => {
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('click', handler);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  // Cart helpers
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const addToCart = useCallback((item: MenuItem, sizeKey?: string) => {
    const price = sizeKey
      ? item.sizes?.find((s) => s.sizeKey === sizeKey)?.price || item.price || 0
      : item.price || 0;
    const key = sizeKey ? `${item.id}__${sizeKey}` : item.id;
    const name = getItemName(item.id, item.name) + (sizeKey ? ` (${sizeKey})` : '');

    setCart((prev) => {
      const existing = prev.find((c) => c.id === key);
      if (existing) return prev.map((c) => c.id === key ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: key, menuItemId: item.id, name, price, quantity: 1, sizeKey, categoryId: activeCatId || '' }];
    });
  }, [activeCatId, getItemName]);

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, quantity: c.quantity + delta } : c).filter((c) => c.quantity > 0));
  };

  // ─── Builder modals ───
  const [showPainFrites, setShowPainFrites] = useState(false);
  const [showPainRond, setShowPainRond] = useState<MenuItem | null>(null);
  const [showMagicBox, setShowMagicBox] = useState<{ item: MenuItem; isExtra: boolean } | null>(null);

  const handleBuilderAdd = useCallback((builderItem: { menuItemId: string; name: string; price: number; categoryId: string; extras?: CartExtra[] }) => {
    const extrasLabel = builderItem.extras?.length ? ` (${builderItem.extras.map((e) => e.name).join(', ')})` : '';
    setCart((prev) => [...prev, {
      id: `${builderItem.menuItemId}_${Date.now()}`,
      menuItemId: builderItem.menuItemId,
      name: builderItem.name + extrasLabel,
      price: builderItem.price,
      quantity: 1,
      categoryId: builderItem.categoryId,
      extras: builderItem.extras,
    }]);
  }, []);

  const handleItemTapKiosk = useCallback((item: MenuItem) => {
    const cat = categories.find((c) => c.id === activeCatId);
    if (cat?.builder || cat?.slug === 'pain-frites') {
      setShowPainFrites(true);
      return;
    }
    if (cat?.slug === 'pains-ronds' || cat?.slug === 'grillades') {
      setShowPainRond(item);
      return;
    }
    if (cat?.slug === 'magic-box') {
      setShowMagicBox({ item, isExtra: item.id.includes('extra') });
      return;
    }
    if (item.sizes && item.sizes.length > 0) {
      setSizePopup(item);
    } else {
      addToCart(item);
    }
  }, [categories, activeCatId, addToCart]);

  // Submit order
  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (submitting) return;
    setSubmitting(true);
    setOrderError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kiosk-Key': process.env.NEXT_PUBLIC_KIOSK_API_KEY || '',
        },
        body: JSON.stringify({
          action: 'create',
          type: 'pickup',
          customerName: tableNumber ? `Borne Table ${tableNumber}` : 'Borne',
          customerPhone: '',
          customerEmail: null,
          deliveryStreet: null, deliveryCity: null, deliveryPostal: null,
          deliveryNotes: tableNumber
            ? `Table ${tableNumber} — ${orderType === 'dine_in' ? t.ui.kiosk_eatIn : t.ui.kiosk_takeAway}`
            : `${orderType === 'dine_in' ? t.ui.kiosk_eatIn : t.ui.kiosk_takeAway}`,
          pickupTime: null,
          paymentMethod: 'on_pickup',
          paymentStatus: 'pending',
          total,
          userId: null,
          locationId: null,
          items: cart.map((c) => ({ menuItemId: c.menuItemId, name: c.name, price: c.price, quantity: c.quantity, sizeKey: c.sizeKey || null, categoryId: c.categoryId })),
        }),
      });
      const order = await res.json();
      setOrderNumber(order.orderNumber || order.id);
      setCart([]);
      setStep('confirm');
      setTimeout(() => { setStep('welcome'); setOrderNumber(null); setOrderType('dine_in'); }, 10000);
    } catch (e) {
      console.error('Kiosk order error:', e);
      setOrderError('Une erreur est survenue. Veuillez réessayer.');
    }
    setSubmitting(false);
  };

  // ═══════════════════════════════════════════
  // STEP 1: WELCOME
  // ═══════════════════════════════════════════
  if (step === 'welcome') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 px-8">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="2H Frites" className="h-32 w-auto mb-10 animate-fade-in" />

        {/* Order button */}
        <button
          onClick={() => setStep('orderType')}
          className="w-full max-w-md py-8 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-extrabold text-3xl active:scale-[0.97] transition-transform shadow-2xl shadow-amber-500/30 mb-8"
        >
          {t.ui.kiosk_orderHere}
        </button>

        {/* Table number */}
        {tableNumber && (
          <p className="text-amber-400 text-xl font-bold mb-4">{t.ui.kiosk_table} {tableNumber}</p>
        )}

        {/* Language selector */}
        <div className="flex gap-3 mb-6">
          {LANGS.map((l) => (
            <button key={l.code} onClick={(e) => { e.stopPropagation(); setLocale(l.code); }}
              className={`px-4 py-3 rounded-2xl text-lg transition-all active:scale-95 ${
                locale === l.code
                  ? 'bg-amber-500/20 border-2 border-amber-500/50 text-white'
                  : 'bg-zinc-800 border-2 border-zinc-700 text-zinc-400'
              }`}>
              <span className="text-2xl">{l.flag}</span>
            </button>
          ))}
        </div>

        <p className="text-zinc-600 text-base">{t.ui.kiosk_touchToStart}</p>
        {orderError && (
          <div className="mt-6 px-6 py-4 rounded-2xl bg-red-500/15 border border-red-500/30 max-w-md">
            <p className="text-red-400 text-base font-medium text-center">{orderError}</p>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 2: ORDER TYPE (eat in / take away)
  // ═══════════════════════════════════════════
  if (step === 'orderType') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 px-8">
        <h1 className="text-3xl font-extrabold text-white mb-12">{t.ui.kiosk_howToEat}</h1>

        <div className="flex gap-6 w-full max-w-lg">
          <button onClick={() => { setOrderType('dine_in'); setStep('menu'); if (categories.length > 0) setActiveCatId(categories[0].id); }}
            className="flex-1 py-12 rounded-3xl bg-zinc-900 border-2 border-zinc-700 hover:border-amber-500/50 transition-all active:scale-95 flex flex-col items-center gap-4">
            <span className="text-6xl">🍽️</span>
            <span className="text-xl font-bold text-white">{t.ui.kiosk_eatIn}</span>
          </button>
          <button onClick={() => { setOrderType('takeaway'); setStep('menu'); if (categories.length > 0) setActiveCatId(categories[0].id); }}
            className="flex-1 py-12 rounded-3xl bg-zinc-900 border-2 border-zinc-700 hover:border-amber-500/50 transition-all active:scale-95 flex flex-col items-center gap-4">
            <span className="text-6xl">🛍️</span>
            <span className="text-xl font-bold text-white">{t.ui.kiosk_takeAway}</span>
          </button>
        </div>

        <button onClick={() => setStep('welcome')}
          className="mt-8 text-zinc-500 text-base hover:text-white transition-colors">{t.ui.kiosk_cancel}</button>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 5: CONFIRMATION
  // ═══════════════════════════════════════════
  if (step === 'confirm') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 px-8">
        <div className="animate-scale-in text-center">
          <span className="text-9xl block mb-6">🎉</span>
          <h1 className="text-4xl font-extrabold text-white mb-3">{t.ui.kiosk_thanks}</h1>
          <p className="text-zinc-400 text-xl mb-10">{t.ui.kiosk_orderRegistered}</p>
          {orderNumber && (
            <div className="inline-block px-12 py-6 rounded-3xl bg-amber-500/15 border-2 border-amber-500/30 mb-10">
              <p className="text-base text-zinc-400">{t.ui.kiosk_orderNumber}</p>
              <p className="text-6xl font-black text-amber-400 mt-2">{orderNumber}</p>
            </div>
          )}
          <p className="text-zinc-500 text-lg">{t.ui.kiosk_goToCounter}</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 3 & 4: MENU + CART
  // ═══════════════════════════════════════════
  const activeItems = categories.find((c) => c.id === activeCatId)?.items.filter((i) => !i.unavailable) || [];

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-16 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="2H" className="h-8 w-8 object-contain" />
          <span className="text-lg font-bold text-white">
            {orderType === 'dine_in' ? t.ui.kiosk_eatIn : t.ui.kiosk_takeAway}
          </span>
          {tableNumber && <span className="text-sm text-amber-400 font-bold ml-2">{t.ui.kiosk_table} {tableNumber}</span>}
        </div>
        <button onClick={() => { setStep('welcome'); setCart([]); setActiveCatId(null); }}
          className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-sm font-medium hover:text-white active:scale-95">
          {t.ui.kiosk_cancel}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Categories sidebar */}
        <div className="w-32 bg-zinc-900/50 border-r border-zinc-800 overflow-y-auto shrink-0">
          {categories.map((cat) => {
            const handleCatTap = () => {
              setActiveCatId(cat.id);
              if (cat.builder && cat.slug === 'pain-frites') setShowPainFrites(true);
            };
            return (
              <button key={cat.id} onClick={handleCatTap}
                className={`w-full py-5 text-center transition-colors border-l-4 ${
                  cat.id === activeCatId
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                    : 'border-transparent text-zinc-500 hover:bg-zinc-800/50'
                }`}>
                <span className="text-3xl block">{cat.icon}</span>
                <span className="text-xs font-bold block mt-2 px-1 leading-tight">{getCategory(cat.nameKey)}</span>
              </button>
            );
          })}
        </div>

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Builder category with no items: show big compose button */}
          {activeItems.length === 0 && categories.find((c) => c.id === activeCatId)?.builder && (
            <div className="flex items-center justify-center h-full">
              <button
                onClick={() => setShowPainFrites(true)}
                className="px-12 py-8 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-center hover:bg-amber-500/20 transition-all active:scale-95"
              >
                <span className="text-7xl block mb-4">{categories.find((c) => c.id === activeCatId)?.icon}</span>
                <p className="text-2xl font-bold text-white">Composer votre Pain-frites</p>
                <p className="text-base text-zinc-400 mt-2">Touchez pour commencer</p>
              </button>
            </div>
          )}

          {activeItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeItems.map((item) => {
                const inCart = cart.find((c) => c.menuItemId === item.id);
                const activeCatSlug = categories.find((c) => c.id === activeCatId)?.slug;
                const isCustomizable = activeCatSlug === 'pains-ronds' || activeCatSlug === 'grillades' || activeCatSlug === 'magic-box';
                return (
                  <button key={item.id}
                    onClick={() => handleItemTapKiosk(item)}
                    className={`relative p-6 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                      inCart ? 'bg-amber-500/10 border-amber-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                    }`}>
                    <p className="text-lg font-bold text-white leading-tight">{getItemName(item.id, item.name)}</p>
                    {item.tags?.includes('popular') && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold mt-2 inline-block">★ Populaire</span>
                    )}
                    <p className="text-xl text-amber-400 font-extrabold mt-3">
                      {item.sizes
                        ? `${formatPrice(item.sizes[0].price)} €`
                        : item.price != null ? `${formatPrice(item.price)} €` : ''}
                    </p>
                    {isCustomizable && (
                      <p className="text-xs text-amber-400/60 mt-2">Personnaliser →</p>
                    )}
                    {inCart && (
                      <span className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-amber-500 text-zinc-950 text-lg font-black flex items-center justify-center shadow-lg">
                        {inCart.quantity}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom cart bar */}
      {itemCount > 0 && step === 'menu' && (
        <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <span className="text-base text-zinc-400">{itemCount} {t.ui.kiosk_items}</span>
              <span className="text-2xl font-extrabold text-amber-400 ml-4">{formatPrice(total)} €</span>
            </div>
            <button onClick={() => setStep('cart')}
              className="px-8 py-4 rounded-2xl bg-amber-500 text-zinc-950 font-extrabold text-base active:scale-95 shadow-lg shadow-amber-500/20">
              {t.ui.kiosk_seeCart} →
            </button>
          </div>
        </div>
      )}

      {/* ═══ CART OVERLAY ═══ */}
      {step === 'cart' && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
          <header className="flex items-center justify-between px-6 h-16 bg-zinc-900 border-b border-zinc-800 shrink-0">
            <button onClick={() => setStep('menu')} className="text-amber-400 font-bold text-base">← {t.ui.kiosk_modify}</button>
            <h2 className="text-lg font-bold text-white">{t.ui.kiosk_myOrder}</h2>
            <div className="w-20" />
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-20">
                <span className="text-6xl block mb-4">🛒</span>
                <p className="text-zinc-500 text-lg">{t.ui.kiosk_empty}</p>
                <p className="text-zinc-600 text-sm mt-2">{t.ui.kiosk_addItems}</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white">{item.name}</p>
                    <p className="text-sm text-zinc-500">{formatPrice(item.price)} € × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateQty(item.id, -1)}
                      className="w-12 h-12 rounded-xl bg-zinc-800 text-white text-xl font-bold flex items-center justify-center active:scale-90 active:bg-zinc-700">−</button>
                    <span className="text-lg font-extrabold text-white w-8 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)}
                      className="w-12 h-12 rounded-xl bg-zinc-800 text-white text-xl font-bold flex items-center justify-center active:scale-90 active:bg-zinc-700">+</button>
                  </div>
                  <span className="text-lg text-amber-400 font-extrabold w-20 text-right">{formatPrice(item.price * item.quantity)} €</span>
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-5 bg-zinc-900 border-t border-zinc-800 space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-white">{t.ui.kiosk_total}</span>
              <span className="text-3xl font-black text-amber-400">{formatPrice(total)} €</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('menu')}
                className="flex-1 py-4 rounded-2xl bg-zinc-800 text-white font-bold text-base active:scale-95">
                + {t.ui.kiosk_addMore}
              </button>
              <button onClick={handleSubmit} disabled={submitting || cart.length === 0}
                className="flex-2 py-4 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-extrabold text-lg active:scale-[0.97] transition-transform disabled:opacity-50 shadow-lg shadow-amber-500/20">
                {submitting ? '...' : t.ui.kiosk_validate}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SIZE POPUP ═══ */}
      {sizePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setSizePopup(null)}>
          <div className="bg-zinc-900 rounded-3xl border-2 border-zinc-700 p-8 w-96 space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-extrabold text-white text-center">{getItemName(sizePopup.id, sizePopup.name)}</h3>
            <p className="text-sm text-zinc-500 text-center">{t.ui.kiosk_chooseSize}</p>
            <div className="space-y-3">
              {sizePopup.sizes?.map((size) => (
                <button key={size.sizeKey}
                  onClick={() => { addToCart(sizePopup, size.sizeKey); setSizePopup(null); }}
                  className="w-full py-5 rounded-2xl bg-zinc-800 border-2 border-zinc-700 text-white font-bold text-lg hover:border-amber-500/40 active:scale-95 transition-all flex items-center justify-between px-6">
                  <span className="capitalize">{size.sizeKey}</span>
                  <span className="text-amber-400 font-extrabold">{formatPrice(size.price)} €</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ─── Builder modals ─── */}
      {showPainFrites && (
        <PainFritesBuilder onClose={() => setShowPainFrites(false)} onAdd={handleBuilderAdd} />
      )}
      {showPainRond && (
        <PainRondBuilder item={showPainRond} onClose={() => setShowPainRond(null)} onAdd={handleBuilderAdd} />
      )}
      {showMagicBox && (
        <MagicBoxBuilder item={showMagicBox.item} isExtra={showMagicBox.isExtra} onClose={() => setShowMagicBox(null)} onAdd={handleBuilderAdd} />
      )}
    </div>
  );
}

// ─── Suspense wrapper ───
export default function KioskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><span className="text-8xl animate-pulse">🍟</span></div>}>
      <KioskContent />
    </Suspense>
  );
}
