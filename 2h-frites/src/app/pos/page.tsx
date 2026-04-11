'use client';

import { useState, useEffect, useCallback } from 'react';
import { menuStore } from '@/stores/menuStore';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { api } from '@/lib/api';
import { formatPrice } from '@/utils/format';
import { Category, MenuItem } from '@/types';
import { CartExtra } from '@/types/order';
import OrderReceipt from '@/components/OrderReceipt';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PainFritesBuilder from '@/components/PainFritesBuilder';
import PainRondBuilder from '@/components/PainRondBuilder';
import MagicBoxBuilder from '@/components/MagicBoxBuilder';

interface POSCartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  sizeKey?: string;
  categoryId: string;
  extras?: CartExtra[];
}

// ─── POS Content ───

function POSContent() {
  const { getCategory, getItemName } = useLanguage();
  const { user } = useAuth();
  const { locationId } = useLocation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSizePopup, setShowSizePopup] = useState<MenuItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState<string | null>(null);
  const [lastOrderData, setLastOrderData] = useState<any>(null);

  useEffect(() => {
    const load = () => {
      const cats = menuStore.getCategories().filter((c) => c.items.length > 0 || c.builder);
      setCategories(cats);
      if (cats.length > 0 && !activeCatId) setActiveCatId(cats[0].id);
    };
    load();
    return menuStore.subscribe(load);
  }, []);

  const activeCat = categories.find((c) => c.id === activeCatId);
  const activeItems = activeCat?.items.filter((i) => !i.unavailable) || [];
  const isBuilderCat = !!(activeCat?.builder || activeCat?.slug === 'pain-frites' || activeCat?.slug === 'pains-ronds' || activeCat?.slug === 'grillades' || activeCat?.slug === 'magic-box');

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // ─── Cart operations ───
  const addToCart = useCallback((item: MenuItem, sizeKey?: string, catId?: string) => {
    const price = sizeKey
      ? item.sizes?.find((s) => s.sizeKey === sizeKey)?.price || item.price || 0
      : item.price || 0;
    const key = sizeKey ? `${item.id}__${sizeKey}` : item.id;
    const name = getItemName(item.id, item.name) + (sizeKey ? ` (${sizeKey})` : '');

    setCart((prev) => {
      const existing = prev.find((c) => c.id === key);
      if (existing) {
        return prev.map((c) => c.id === key ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { id: key, menuItemId: item.id, name, price, quantity: 1, sizeKey, categoryId: catId || activeCatId || '' }];
    });
  }, [activeCatId, getItemName]);

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((c) => c.id === id ? { ...c, quantity: c.quantity + delta } : c);
      return updated.filter((c) => c.quantity > 0);
    });
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));
  const clearCart = () => setCart([]);

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

  // Auto-open builder when selecting a builder category
  const handleCategoryTap = (catId: string) => {
    setActiveCatId(catId);
    const cat = categories.find((c) => c.id === catId);
    // Auto-open pain-frites builder (no items to click)
    if (cat?.builder && cat?.slug === 'pain-frites') {
      setShowPainFrites(true);
    }
  };

  const handleItemTap = (item: MenuItem) => {
    // Builders: pains-ronds & grillades have items, magic-box too
    if (activeCat?.slug === 'pains-ronds' || activeCat?.slug === 'grillades') {
      setShowPainRond(item);
      return;
    }
    if (activeCat?.slug === 'magic-box') {
      setShowMagicBox({ item, isExtra: item.id.includes('extra') });
      return;
    }
    if (item.sizes && item.sizes.length > 0) {
      setShowSizePopup(item);
    } else {
      addToCart(item);
    }
  };

  // ─── Checkout ───
  const [orderType, setOrderType] = useState<'pickup' | 'dine_in'>('dine_in');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [orderError, setOrderError] = useState<string | null>(null);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    if (submitting) return;
    setSubmitting(true);
    setOrderError(null);
    try {
      const order = await api.post<any>('/orders', {
        action: 'create',
        type: orderType,
        customerName: customerName || 'Client comptoir',
        customerPhone: '',
        customerEmail: null,
        deliveryStreet: null,
        deliveryCity: null,
        deliveryPostal: null,
        deliveryNotes: orderType === 'dine_in' ? 'Sur place' : null,
        pickupTime: null,
        paymentMethod: paymentMethod === 'cash' ? 'on_pickup' : 'card',
        paymentStatus: paymentMethod === 'card' ? 'paid' : 'pending',
        total,
        userId: user?.id || null,
        locationId: locationId || null,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          name: c.name,
          price: c.price,
          quantity: c.quantity,
          sizeKey: c.sizeKey || null,
          categoryId: c.categoryId,
        })),
      });
      setLastOrder(order.orderNumber);
      setLastOrderData(order);
      setCart([]);
      setShowCheckout(false);
      setCustomerName('');
      setOrderError(null);
      setTimeout(() => setLastOrder(null), 5000);
    } catch (e: any) {
      console.error('POS order error:', e);
      setOrderError(e?.error || 'Erreur lors de la commande. Réessayez.');
    }
    setSubmitting(false);
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 h-14 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="2H" className="h-7 w-7 object-contain" />
          <span className="text-base font-bold text-white">Caisse POS</span>
          {user && <span className="text-sm text-zinc-500 ml-1">{user.name}</span>}
        </div>
        <div className="flex items-center gap-3">
          {lastOrder && (
            <span className="px-4 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-bold animate-pulse">
              ✓ {lastOrder}
            </span>
          )}
          <a href="/admin" className="text-sm text-zinc-500 hover:text-white transition-colors">Admin ↗</a>
        </div>
      </header>

      {/* Main area: 3 columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Categories */}
        <div className="w-24 sm:w-28 lg:w-32 bg-zinc-900/50 border-r border-zinc-800 overflow-y-auto shrink-0">
          {categories.map((cat) => {
            const isActive = cat.id === activeCatId;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryTap(cat.id)}
                className={`w-full py-4 px-1 text-center transition-colors border-l-3 ${
                  isActive
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <span className="text-2xl block">{cat.icon}</span>
                <span className="text-xs font-medium block mt-1.5 leading-tight px-0.5">
                  {getCategory(cat.nameKey)}
                </span>
                {cat.builder && (
                  <span className="text-[9px] text-amber-400/60 block mt-0.5">Composer</span>
                )}
              </button>
            );
          })}
        </div>

        {/* CENTER: Items grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Builder category: show big action button */}
          {isBuilderCat && activeItems.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <button
                onClick={() => {
                  if (activeCat?.slug === 'pain-frites') setShowPainFrites(true);
                }}
                className="px-8 py-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-center hover:bg-amber-500/20 transition-all active:scale-95"
              >
                <span className="text-5xl block mb-3">{activeCat?.icon}</span>
                <p className="text-lg font-bold text-white">Composer un {getCategory(activeCat?.nameKey || '')}</p>
                <p className="text-sm text-zinc-400 mt-1">Cliquez pour démarrer</p>
              </button>
            </div>
          )}

          {/* Regular items grid */}
          {activeItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {activeItems.map((item) => {
                const inCart = cart.find((c) => c.menuItemId === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemTap(item)}
                    className={`relative p-4 rounded-xl border text-left transition-all active:scale-95 ${
                      inCart
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <p className="text-sm font-semibold text-white leading-snug">
                      {getItemName(item.id, item.name)}
                    </p>
                    <p className="text-sm text-amber-400 font-bold mt-1.5">
                      {item.sizes
                        ? `${formatPrice(item.sizes[0].price)}–${formatPrice(item.sizes[item.sizes.length - 1].price)} €`
                        : item.price != null
                          ? `${formatPrice(item.price)} €`
                          : ''}
                    </p>
                    {(activeCat?.slug === 'pains-ronds' || activeCat?.slug === 'grillades') && (
                      <span className="text-[10px] text-amber-400/60 mt-1 block">Personnaliser →</span>
                    )}
                    {activeCat?.slug === 'magic-box' && (
                      <span className="text-[10px] text-amber-400/60 mt-1 block">Composer →</span>
                    )}
                    {item.tags?.includes('popular') && (
                      <span className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">★</span>
                    )}
                    {inCart && (
                      <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500 text-zinc-950 text-xs font-bold flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Cart */}
        <div className="w-72 sm:w-80 lg:w-96 bg-zinc-900/50 border-l border-zinc-800 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-base font-bold text-white">{itemCount} article{itemCount > 1 ? 's' : ''}</span>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-300 font-medium">Vider</button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {cart.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-8">Sélectionnez un article</p>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{item.name}</p>
                    <p className="text-xs text-zinc-500">{formatPrice(item.price)} €</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQty(item.id, -1)}
                      className="w-8 h-8 rounded-lg bg-zinc-700 text-white text-base font-bold flex items-center justify-center active:scale-90">−</button>
                    <span className="text-sm font-bold text-white w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)}
                      className="w-8 h-8 rounded-lg bg-zinc-700 text-white text-base font-bold flex items-center justify-center active:scale-90">+</button>
                  </div>
                  <span className="text-sm text-amber-400 font-bold w-16 text-right">{formatPrice(item.price * item.quantity)} €</span>
                  <button onClick={() => removeItem(item.id)} className="text-zinc-600 hover:text-red-400 text-base p-1">✕</button>
                </div>
              ))
            )}
          </div>

          {/* Total + checkout button */}
          <div className="px-4 py-4 border-t border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-white">Total</span>
              <span className="text-2xl font-extrabold text-amber-400">{formatPrice(total)} €</span>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              className="w-full py-4 rounded-xl bg-amber-500 text-zinc-950 font-extrabold text-lg active:scale-[0.97] transition-transform disabled:opacity-30"
            >
              Encaisser
            </button>
          </div>
        </div>
      </div>

      {/* Size popup */}
      {showSizePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSizePopup(null)}>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 w-80 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white text-center">{getItemName(showSizePopup.id, showSizePopup.name)}</h3>
            <div className="space-y-2">
              {showSizePopup.sizes?.map((size) => (
                <button key={size.sizeKey}
                  onClick={() => { addToCart(showSizePopup, size.sizeKey); setShowSizePopup(null); }}
                  className="w-full py-4 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-semibold text-base hover:border-amber-500/30 active:scale-95 transition-all flex items-center justify-between px-5">
                  <span className="capitalize">{size.sizeKey}</span>
                  <span className="text-amber-400 font-bold">{formatPrice(size.price)} €</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setShowCheckout(false); setOrderError(null); }}>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 w-[28rem] space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white text-center">Encaisser — {formatPrice(total)} €</h3>

            {/* Order type */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setOrderType('dine_in')}
                className={`py-4 rounded-xl text-base font-bold transition-all ${orderType === 'dine_in' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                🏪 Sur place
              </button>
              <button onClick={() => setOrderType('pickup')}
                className={`py-4 rounded-xl text-base font-bold transition-all ${orderType === 'pickup' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                🛍️ À emporter
              </button>
            </div>

            {/* Customer name */}
            <input
              type="text"
              placeholder="Nom du client (optionnel)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-4 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-base placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
            />

            {/* Payment method */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPaymentMethod('cash')}
                className={`py-4 rounded-xl text-base font-bold transition-all ${paymentMethod === 'cash' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                💵 Espèces
              </button>
              <button onClick={() => setPaymentMethod('card')}
                className={`py-4 rounded-xl text-base font-bold transition-all ${paymentMethod === 'card' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                💳 Carte
              </button>
            </div>

            {/* Error */}
            {orderError && (
              <p className="text-base text-red-400 bg-red-500/10 rounded-lg px-4 py-3 text-center">{orderError}</p>
            )}

            {/* Submit */}
            <button onClick={handleSubmitOrder} disabled={submitting}
              className="w-full py-5 rounded-xl bg-amber-500 text-zinc-950 font-extrabold text-xl active:scale-[0.97] transition-transform disabled:opacity-50">
              {submitting ? 'Envoi...' : `Valider — ${formatPrice(total)} €`}
            </button>

            <button onClick={() => { setShowCheckout(false); setOrderError(null); }}
              className="w-full text-center text-zinc-500 text-base py-2 hover:text-zinc-300 transition-colors">Annuler</button>
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {lastOrderData && (
        <OrderReceipt order={lastOrderData} onClose={() => setLastOrderData(null)} />
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

// ─── Protected wrapper ───

export default function POSPage() {
  return (
    <ProtectedRoute allowedRoles={['patron', 'manager', 'employe', 'franchisor_admin', 'franchisee_owner', 'location_manager']}>
      <POSContent />
    </ProtectedRoute>
  );
}
