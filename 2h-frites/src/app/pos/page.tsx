'use client';

import { useState, useEffect, useCallback } from 'react';
import { menuStore } from '@/stores/menuStore';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { api } from '@/lib/api';
import { formatPrice } from '@/utils/format';
import { Category, MenuItem } from '@/types';
import OrderReceipt from '@/components/OrderReceipt';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface POSCartItem {
  id: string; // unique key
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  sizeKey?: string;
  categoryId: string;
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
    const cats = menuStore.getCategories().filter((c) => !c.builder);
    setCategories(cats);
    if (cats.length > 0) setActiveCatId(cats[0].id);
    return menuStore.subscribe(() => {
      const updated = menuStore.getCategories().filter((c) => !c.builder);
      setCategories(updated);
    });
  }, []);

  const activeCat = categories.find((c) => c.id === activeCatId);
  const activeItems = activeCat?.items.filter((i) => !i.unavailable) || [];

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

  const handleItemTap = (item: MenuItem) => {
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

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const order = await api.post<any>('/orders', {
        action: 'create',
        type: orderType === 'dine_in' ? 'pickup' : 'pickup',
        customerName: customerName || 'Client comptoir',
        customerPhone: '',
        customerEmail: null,
        deliveryStreet: null,
        deliveryCity: null,
        deliveryPostal: null,
        deliveryNotes: orderType === 'dine_in' ? 'Sur place' : null,
        pickupTime: null,
        paymentMethod: paymentMethod === 'cash' ? 'on_pickup' : 'on_pickup',
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
      setTimeout(() => setLastOrder(null), 5000);
    } catch (e) {
      console.error('POS order error:', e);
    }
    setSubmitting(false);
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 h-12 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="2H" className="h-6 w-6 object-contain" />
          <span className="text-sm font-bold text-white">Caisse</span>
          {user && <span className="text-xs text-zinc-500 ml-2">{user.name}</span>}
        </div>
        <div className="flex items-center gap-3">
          {lastOrder && (
            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold animate-pulse">
              ✓ {lastOrder}
            </span>
          )}
          <a href="/admin" className="text-xs text-zinc-500 hover:text-white">Admin</a>
        </div>
      </header>

      {/* Main area: 3 columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Categories */}
        <div className="w-20 sm:w-24 bg-zinc-900/50 border-r border-zinc-800 overflow-y-auto shrink-0">
          {categories.map((cat) => {
            const isActive = cat.id === activeCatId;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCatId(cat.id)}
                className={`w-full py-3 px-1 text-center transition-colors border-l-2 ${
                  isActive
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <span className="text-xl block">{cat.icon}</span>
                <span className="text-[10px] font-medium block mt-1 leading-tight truncate px-0.5">
                  {getCategory(cat.nameKey)}
                </span>
              </button>
            );
          })}
        </div>

        {/* CENTER: Items grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {activeItems.map((item) => {
              const inCart = cart.find((c) => c.menuItemId === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemTap(item)}
                  className={`relative p-3 rounded-xl border text-left transition-all active:scale-95 ${
                    inCart
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-sm font-medium text-white leading-tight truncate">
                    {getItemName(item.id, item.name)}
                  </p>
                  <p className="text-xs text-amber-400 font-bold mt-1">
                    {item.sizes
                      ? `${formatPrice(item.sizes[0].price)}–${formatPrice(item.sizes[item.sizes.length - 1].price)} €`
                      : item.price != null
                        ? `${formatPrice(item.price)} €`
                        : ''}
                  </p>
                  {item.tags?.includes('popular') && (
                    <span className="absolute top-1 right-1 text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">★</span>
                  )}
                  {inCart && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-zinc-950 text-xs font-bold flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Cart */}
        <div className="w-64 sm:w-72 lg:w-80 bg-zinc-900/50 border-l border-zinc-800 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-sm font-bold text-white">{itemCount} article{itemCount > 1 ? 's' : ''}</span>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-300">Vider</button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {cart.length === 0 ? (
              <p className="text-zinc-600 text-xs text-center py-8">Tapez un article pour l&apos;ajouter</p>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-800/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-zinc-500">{formatPrice(item.price)} €</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateQty(item.id, -1)}
                      className="w-6 h-6 rounded bg-zinc-700 text-white text-xs font-bold flex items-center justify-center active:scale-90">−</button>
                    <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)}
                      className="w-6 h-6 rounded bg-zinc-700 text-white text-xs font-bold flex items-center justify-center active:scale-90">+</button>
                  </div>
                  <span className="text-xs text-amber-400 font-bold w-14 text-right">{formatPrice(item.price * item.quantity)} €</span>
                  <button onClick={() => removeItem(item.id)} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>
                </div>
              ))
            )}
          </div>

          {/* Total + checkout button */}
          <div className="px-3 py-3 border-t border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Total</span>
              <span className="text-xl font-extrabold text-amber-400">{formatPrice(total)} €</span>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              className="w-full py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-30"
            >
              Encaisser
            </button>
          </div>
        </div>
      </div>

      {/* Size popup */}
      {showSizePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSizePopup(null)}>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-5 w-72 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white text-center">{getItemName(showSizePopup.id, showSizePopup.name)}</h3>
            <div className="space-y-2">
              {showSizePopup.sizes?.map((size) => (
                <button key={size.sizeKey}
                  onClick={() => { addToCart(showSizePopup, size.sizeKey); setShowSizePopup(null); }}
                  className="w-full py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-medium text-sm hover:border-amber-500/30 active:scale-95 transition-all flex items-center justify-between px-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCheckout(false)}>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white text-center">Encaisser — {formatPrice(total)} €</h3>

            {/* Order type */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setOrderType('dine_in')}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${orderType === 'dine_in' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                🏪 Sur place
              </button>
              <button onClick={() => setOrderType('pickup')}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${orderType === 'pickup' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                🛍️ À emporter
              </button>
            </div>

            {/* Customer name (optional) */}
            <input
              type="text"
              placeholder="Nom du client (optionnel)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
            />

            {/* Payment method */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPaymentMethod('cash')}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${paymentMethod === 'cash' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                💵 Espèces
              </button>
              <button onClick={() => setPaymentMethod('card')}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${paymentMethod === 'card' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                💳 Carte
              </button>
            </div>

            {/* Submit */}
            <button onClick={handleSubmitOrder} disabled={submitting}
              className="w-full py-4 rounded-xl bg-amber-500 text-zinc-950 font-extrabold text-lg active:scale-[0.97] transition-transform disabled:opacity-50">
              {submitting ? 'Envoi...' : `Valider — ${formatPrice(total)} €`}
            </button>

            <button onClick={() => setShowCheckout(false)} className="w-full text-center text-zinc-500 text-sm py-1">Annuler</button>
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {lastOrderData && (
        <OrderReceipt order={lastOrderData} onClose={() => setLastOrderData(null)} />
      )}
    </div>
  );
}

// ─── Protected wrapper ───

export default function POSPage() {
  return (
    <ProtectedRoute allowedRoles={['patron', 'manager', 'employe', 'franchisor_admin', 'location_manager']}>
      <POSContent />
    </ProtectedRoute>
  );
}
