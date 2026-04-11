'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { menuStore } from '@/stores/menuStore';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';
import { Category, MenuItem } from '@/types';

interface KioskCartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  sizeKey?: string;
  categoryId: string;
}

type KioskStep = 'welcome' | 'menu' | 'cart' | 'confirm';
const IDLE_TIMEOUT = 60000; // 60s inactivity → back to welcome

function KioskContent() {
  const { getCategory, getItemName } = useLanguage();
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get('table');

  const [step, setStep] = useState<KioskStep>('welcome');
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [cart, setCart] = useState<KioskCartItem[]>([]);
  const [sizePopup, setSizePopup] = useState<MenuItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cats = menuStore.getCategories().filter((c) => !c.builder && c.items.length > 0);
    setCategories(cats);
    return menuStore.subscribe(() => {
      setCategories(menuStore.getCategories().filter((c) => !c.builder && c.items.length > 0));
    });
  }, []);

  // Idle timer — reset on any touch
  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (step !== 'welcome' && step !== 'confirm') {
      idleTimer.current = setTimeout(() => {
        setStep('welcome');
        setCart([]);
        setActiveCatId(null);
      }, IDLE_TIMEOUT);
    }
  }, [step]);

  useEffect(() => {
    resetIdle();
    const handler = () => resetIdle();
    window.addEventListener('touchstart', handler);
    window.addEventListener('click', handler);
    return () => {
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('click', handler);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

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

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          type: 'pickup',
          customerName: tableNumber ? `Borne Table ${tableNumber}` : 'Borne',
          customerPhone: '',
          customerEmail: null,
          deliveryStreet: null, deliveryCity: null, deliveryPostal: null, deliveryNotes: tableNumber ? `Table ${tableNumber} — Sur place` : 'Commande borne — Sur place',
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
      setTimeout(() => { setStep('welcome'); setOrderNumber(null); }, 8000);
    } catch (e) {
      console.error('Kiosk order error:', e);
    }
    setSubmitting(false);
  };

  // ─── WELCOME ───
  if (step === 'welcome') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 px-8"
        onClick={() => { setStep('menu'); if (categories.length > 0) setActiveCatId(categories[0].id); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="2H Frites" className="h-28 w-auto mb-8" />
        <div className="w-full max-w-md">
          <button className="w-full py-6 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-extrabold text-2xl active:scale-[0.97] transition-transform shadow-2xl shadow-amber-500/30">
            Commander ici
          </button>
        </div>
        {tableNumber && (
          <p className="text-amber-400 text-lg font-bold mt-6">Table {tableNumber}</p>
        )}
        <p className="text-zinc-600 text-sm mt-4">Touchez l&apos;écran pour commencer</p>
      </div>
    );
  }

  // ─── CONFIRM ───
  if (step === 'confirm') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 px-8">
        <span className="text-8xl mb-6">🎉</span>
        <h1 className="text-4xl font-extrabold text-white mb-2">Merci !</h1>
        <p className="text-zinc-400 text-lg mb-8">Votre commande a bien été enregistrée</p>
        {orderNumber && (
          <div className="px-8 py-4 rounded-2xl bg-amber-500/15 border border-amber-500/30">
            <p className="text-sm text-zinc-400 text-center">Numéro de commande</p>
            <p className="text-5xl font-black text-amber-400 text-center mt-1">{orderNumber}</p>
          </div>
        )}
        <p className="text-zinc-600 text-xs mt-8">Présentez-vous au comptoir pour le paiement</p>
      </div>
    );
  }

  // ─── MENU + CART ───
  const activeItems = categories.find((c) => c.id === activeCatId)?.items.filter((i) => !i.unavailable) || [];

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="2H" className="h-7 w-7 object-contain" />
          <span className="text-base font-bold text-white">Commander</span>
        </div>
        <button onClick={() => { setStep('welcome'); setCart([]); setActiveCatId(null); }}
          className="text-sm text-zinc-500 hover:text-white px-3 py-1 rounded-lg">
          Annuler
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Categories */}
        <div className="w-24 bg-zinc-900/50 border-r border-zinc-800 overflow-y-auto shrink-0">
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCatId(cat.id)}
              className={`w-full py-4 text-center transition-colors border-l-3 ${
                cat.id === activeCatId
                  ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-500 hover:bg-zinc-800/50'
              }`}>
              <span className="text-2xl block">{cat.icon}</span>
              <span className="text-[10px] font-medium block mt-1 truncate px-1">{getCategory(cat.nameKey)}</span>
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {activeItems.map((item) => {
              const inCart = cart.find((c) => c.menuItemId === item.id);
              return (
                <button key={item.id}
                  onClick={() => item.sizes?.length ? setSizePopup(item) : addToCart(item)}
                  className={`relative p-4 rounded-2xl border text-left transition-all active:scale-95 ${
                    inCart ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}>
                  <p className="text-base font-semibold text-white leading-tight">{getItemName(item.id, item.name)}</p>
                  <p className="text-sm text-amber-400 font-bold mt-2">
                    {item.sizes
                      ? `à partir de ${formatPrice(item.sizes[0].price)} €`
                      : item.price != null ? `${formatPrice(item.price)} €` : ''}
                  </p>
                  {inCart && (
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-500 text-zinc-950 text-sm font-extrabold flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom cart bar */}
      {cart.length > 0 && step === 'menu' && (
        <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 max-w-2xl mx-auto">
            <div className="flex-1">
              <span className="text-sm text-zinc-400">{itemCount} article{itemCount > 1 ? 's' : ''}</span>
              <span className="text-lg font-extrabold text-amber-400 ml-3">{formatPrice(total)} €</span>
            </div>
            <button onClick={() => setStep('cart')}
              className="px-6 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95">
              Voir mon panier →
            </button>
          </div>
        </div>
      )}

      {/* Cart step */}
      {step === 'cart' && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
          <header className="flex items-center justify-between px-6 h-14 bg-zinc-900 border-b border-zinc-800 shrink-0">
            <button onClick={() => setStep('menu')} className="text-amber-400 font-medium text-sm">← Modifier</button>
            <h2 className="text-base font-bold text-white">Mon panier</h2>
            <div className="w-16" />
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-zinc-500">{formatPrice(item.price)} € × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.id, -1)}
                    className="w-10 h-10 rounded-xl bg-zinc-800 text-white text-lg font-bold flex items-center justify-center active:scale-90">−</button>
                  <span className="text-base font-bold text-white w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, 1)}
                    className="w-10 h-10 rounded-xl bg-zinc-800 text-white text-lg font-bold flex items-center justify-center active:scale-90">+</button>
                </div>
                <span className="text-base text-amber-400 font-bold w-16 text-right">{formatPrice(item.price * item.quantity)} €</span>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white">Total</span>
              <span className="text-2xl font-extrabold text-amber-400">{formatPrice(total)} €</span>
            </div>
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-extrabold text-lg active:scale-[0.97] transition-transform disabled:opacity-50 shadow-lg shadow-amber-500/20">
              {submitting ? 'Envoi en cours...' : 'Commander'}
            </button>
          </div>
        </div>
      )}

      {/* Size popup */}
      {sizePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSizePopup(null)}>
          <div className="bg-zinc-900 rounded-3xl border border-zinc-700 p-6 w-80 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white text-center">{getItemName(sizePopup.id, sizePopup.name)}</h3>
            <div className="space-y-2">
              {sizePopup.sizes?.map((size) => (
                <button key={size.sizeKey}
                  onClick={() => { addToCart(sizePopup, size.sizeKey); setSizePopup(null); }}
                  className="w-full py-4 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-medium text-base hover:border-amber-500/30 active:scale-95 transition-all flex items-center justify-between px-5">
                  <span className="capitalize">{size.sizeKey}</span>
                  <span className="text-amber-400 font-bold">{formatPrice(size.price)} €</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KioskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><span className="text-6xl animate-pulse">🍟</span></div>}>
      <KioskContent />
    </Suspense>
  );
}
