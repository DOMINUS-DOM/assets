'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { menuStore } from '@/stores/menuStore';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';
import { getCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { Category, MenuItem, Locale } from '@/types';
import { CartExtra } from '@/types/order';
import GenericBuilder from '@/components/GenericBuilder';
import { menuApi } from '@/lib/menuApi';
import { useTenant, useModule } from '@/contexts/TenantContext';
import { FeatureDisabledPage } from '@/components/FeatureGate';

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
  const { tenant } = useTenant();
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get('table');

  const [step, setStep] = useState<KioskStep>('welcome');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(sessionStorage.getItem('kiosk-cart') || '[]'); } catch { return []; }
  });
  const [sizePopup, setSizePopup] = useState<MenuItem | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist cart to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('kiosk-cart', JSON.stringify(cart));
  }, [cart]);

  // Load menu
  useEffect(() => {
    const load = () => {
      const cats = menuStore.getCategories().filter((c) => c.items.length > 0 || c.builder);
      setCategories(cats);
    };
    load();
    return menuStore.subscribe(load);
  }, []);

  // Idle timer with warning
  const [idleWarning, setIdleWarning] = useState(false);
  const idleWarningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (idleWarningTimer.current) clearTimeout(idleWarningTimer.current);
    setIdleWarning(false);
    if (step !== 'welcome' && step !== 'confirm') {
      // Show warning 10s before reset
      idleWarningTimer.current = setTimeout(() => {
        setIdleWarning(true);
      }, IDLE_TIMEOUT - 10000);
      // Actually reset
      idleTimer.current = setTimeout(() => {
        setStep('welcome');
        setCart([]);
        setActiveCatId(null);
        setOrderType('dine_in');
        setIdleWarning(false);
        sessionStorage.removeItem('kiosk-cart');
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

  // Check if cart already has a drink (for upsell logic)
  const hasDrink = cart.some((c) => c.categoryId === 'boissons');

  const addToCart = useCallback((item: MenuItem, sizeKey?: string) => {
    const price = sizeKey
      ? item.sizes?.find((s) => s.sizeKey === sizeKey)?.price || item.price || 0
      : item.price || 0;
    const key = sizeKey ? `${item.id}__${sizeKey}` : item.id;
    const name = getItemName(item.id, item.name) + (sizeKey ? ` (${sizeKey})` : '');
    const catId = activeCatId || '';

    setCart((prev) => {
      const existing = prev.find((c) => c.id === key);
      if (existing) return prev.map((c) => c.id === key ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: key, menuItemId: item.id, name, price, quantity: 1, sizeKey, categoryId: catId }];
    });
    // Upsell: suggest drink after adding food
    if (catId !== 'boissons' && !hasDrink) {
      setTimeout(() => setShowUpsell(true), 300);
    }
  }, [activeCatId, getItemName, hasDrink]);

  // Frites with size + sel/épicé (aligned with POS)
  const addFrites = useCallback((item: MenuItem, sizeKey: string, opts: { sel: boolean; epice: boolean }) => {
    const price = item.sizes?.find((s) => s.sizeKey === sizeKey)?.price || item.price || 0;
    const labels: string[] = [];
    const extras: { name: string; price: number }[] = [];
    if (opts.sel) { labels.push('Sel'); extras.push({ name: 'Sel', price: 0 }); }
    if (opts.epice) { labels.push('Epice'); extras.push({ name: 'Epice', price: 0 }); }
    const labelStr = labels.length > 0 ? labels.join('+') : 'Nature';
    const name = `${getItemName(item.id, item.name)} (${sizeKey}) ${labelStr}`;
    const key = `${item.id}__${sizeKey}__${labelStr}`;

    setCart((prev) => {
      const existing = prev.find((c) => c.id === key);
      if (existing) return prev.map((c) => c.id === key ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: key, menuItemId: item.id, name, price, quantity: 1, sizeKey, categoryId: 'frites', extras }];
    });
    setSizePopup(null);
    if (!hasDrink) setTimeout(() => setShowUpsell(true), 300);
  }, [getItemName, hasDrink]);

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, quantity: c.quantity + delta } : c).filter((c) => c.quantity > 0));
  };

  // ─── Builder modals ───
  // ─── Generic Builder ───
  const [builderData, setBuilderData] = useState<any>(null);
  const [builderLoading, setBuilderLoading] = useState(false);

  const openBuilder = useCallback(async (productId: string, opts?: { allowSimpleAdd?: boolean }) => {
    setBuilderLoading(true);
    try {
      const data = await menuApi.getBuilderData(productId);
      if (data?.product) {
        setBuilderData({ product: data.product, builderConfig: data.builderConfig, modifierGroups: data.modifierGroups, allowSimpleAdd: opts?.allowSimpleAdd });
      }
    } catch (e) { console.error('Failed to load builder:', e); }
    setBuilderLoading(false);
  }, []);

  const resolveAndOpenBuilder = useCallback(async (item: MenuItem, allowSimple: boolean) => {
    try {
      const cats = await menuApi.loadFull();
      const activeSlug = categories.find((c) => c.id === activeCatId)?.slug;
      if (activeSlug) {
        for (const cat of cats) {
          if (cat.slug === activeSlug) {
            for (const prod of cat.items) {
              if (prod.nameKey === item.id || prod.name === item.name) {
                openBuilder(prod.id, { allowSimpleAdd: allowSimple });
                return;
              }
            }
          }
        }
      }
      for (const cat of cats) {
        for (const prod of cat.items) {
          if (prod.nameKey === item.id || prod.name === item.name) {
            openBuilder(prod.id, { allowSimpleAdd: allowSimple });
            return;
          }
        }
      }
      addToCart(item);
    } catch (e) { addToCart(item); }
  }, [openBuilder, addToCart, categories, activeCatId]);

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
    if (!hasDrink) setTimeout(() => setShowUpsell(true), 300);
  }, [hasDrink]);

  const handleItemTapKiosk = useCallback(async (item: MenuItem) => {
    const cat = categories.find((c) => c.id === activeCatId);
    if (cat?.builder || cat?.slug === 'pain-frites') {
      try {
        const cats = await menuApi.loadFull();
        for (const c of cats) {
          if (c.slug === (cat?.slug || 'pain-frites') || c.nameKey === cat?.nameKey) {
            for (const prod of c.items) {
              if (prod.builderConfig) { openBuilder(prod.id); return; }
            }
            if (c.items.length > 0) { openBuilder(c.items[0].id); return; }
          }
        }
      } catch (e) { console.error(e); }
      return;
    }
    if (cat?.slug === 'pains-ronds' || cat?.slug === 'grillades') {
      resolveAndOpenBuilder(item, true);
      return;
    }
    if (cat?.slug === 'magic-box') {
      resolveAndOpenBuilder(item, false);
      return;
    }
    if (item.sizes && item.sizes.length > 0) {
      setSizePopup(item);
    } else {
      addToCart(item);
    }
  }, [categories, activeCatId, addToCart, openBuilder, resolveAndOpenBuilder]);

  // Submit order
  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (submitting) return;
    setSubmitting(true);
    setOrderError(null);
    try {
      const res = await fetch('/api/kiosk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          type: orderType === 'dine_in' ? 'dine_in' : 'pickup',
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
          items: cart.map((c) => ({ menuItemId: c.menuItemId, name: c.name, price: c.price, quantity: c.quantity, sizeKey: c.sizeKey || null, categoryId: c.categoryId, extras: c.extras ? JSON.stringify(c.extras) : '[]' })),
        }),
      });
      const order = await res.json();
      setOrderNumber(order.orderNumber || order.id);
      setCart([]);
      setStep('confirm');
      setTimeout(() => { setStep('welcome'); setOrderNumber(null); setOrderType('dine_in'); }, 10000);
    } catch (e) {
      console.error('Kiosk order error:', e);
      setOrderError(t.ui.res_error || 'Erreur. Réessayez.');
      // Auto-recover: go back to menu after 5s if error persists
      setTimeout(() => { if (step === 'cart') setOrderError(null); }, 5000);
    }
    setSubmitting(false);
  };

  // ═══════════════════════════════════════════
  // STEP 1: WELCOME
  // ═══════════════════════════════════════════
  if (step === 'welcome') {
    return (
      <div className="dark h-screen flex flex-col items-center justify-center bg-zinc-950 text-white px-8">
        {/* Logo */}
        {tenant?.branding?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenant.branding.logoUrl} alt={tenant.branding.brandName || tenant.name || 'Restaurant'} className="h-32 w-auto mb-10 animate-fade-in object-contain" />
        ) : (
          <h1 className="text-5xl font-extrabold text-white mb-10 animate-fade-in tracking-tight">
            {tenant?.branding?.brandName || tenant?.name || ''}
          </h1>
        )}

        {/* Order button */}
        <button
          onClick={() => setStep('orderType')}
          className="w-full max-w-md py-8 rounded-3xl bg-gradient-to-r from-brand to-orange-500 text-zinc-950 font-extrabold text-3xl active:scale-[0.97] transition-transform shadow-2xl shadow-brand/30 mb-8"
        >
          {t.ui.kiosk_orderHere}
        </button>

        {/* Table number */}
        {tableNumber && (
          <p className="text-brand-light text-xl font-bold mb-4">{t.ui.kiosk_table} {tableNumber}</p>
        )}

        {/* Language selector */}
        <div className="flex gap-3 mb-6">
          {LANGS.map((l) => (
            <button key={l.code} onClick={(e) => { e.stopPropagation(); setLocale(l.code); }}
              className={`px-4 py-3 rounded-2xl text-lg transition-all active:scale-95 ${
                locale === l.code
                  ? 'bg-brand/20 border-2 border-brand/50 text-white'
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
      <div className="dark h-screen flex flex-col items-center justify-center bg-zinc-950 text-white px-8">
        <h1 className="text-3xl font-extrabold text-white mb-12">{t.ui.kiosk_howToEat}</h1>

        <div className="flex gap-6 w-full max-w-lg">
          <button onClick={() => { setOrderType('dine_in'); setStep('menu'); if (categories.length > 0) setActiveCatId(categories[0].id); }}
            className="flex-1 py-12 rounded-3xl bg-zinc-900 border-2 border-zinc-700 hover:border-brand/50 transition-all active:scale-95 flex flex-col items-center gap-4">
            <span className="text-6xl">🍽️</span>
            <span className="text-xl font-bold text-white">{t.ui.kiosk_eatIn}</span>
          </button>
          <button onClick={() => { setOrderType('takeaway'); setStep('menu'); if (categories.length > 0) setActiveCatId(categories[0].id); }}
            className="flex-1 py-12 rounded-3xl bg-zinc-900 border-2 border-zinc-700 hover:border-brand/50 transition-all active:scale-95 flex flex-col items-center gap-4">
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
      <div className="dark h-screen flex flex-col items-center justify-center bg-zinc-950 text-white px-8">
        <div className="animate-scale-in text-center">
          <span className="text-9xl block mb-6">🎉</span>
          <h1 className="text-4xl font-extrabold text-white mb-3">{t.ui.kiosk_thanks}</h1>
          <p className="text-zinc-400 text-xl mb-10">{t.ui.kiosk_orderRegistered}</p>
          {orderNumber && (
            <div className="inline-block px-12 py-6 rounded-3xl bg-brand/15 border-2 border-brand/30 mb-10">
              <p className="text-base text-zinc-400">{t.ui.kiosk_orderNumber}</p>
              <p className="text-6xl font-black text-brand-light mt-2">{orderNumber}</p>
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
    <div className="dark h-screen flex flex-col bg-zinc-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-16 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          {tenant?.branding?.faviconUrl || tenant?.branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.branding.faviconUrl || tenant.branding.logoUrl} alt={tenant.branding.brandName || tenant.name || 'Restaurant'} className="h-8 w-8 object-contain" />
          ) : null}
          <span className="text-lg font-bold text-white">
            {orderType === 'dine_in' ? t.ui.kiosk_eatIn : t.ui.kiosk_takeAway}
          </span>
          {tableNumber && <span className="text-sm text-brand-light font-bold ml-2">{t.ui.kiosk_table} {tableNumber}</span>}
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
            const handleCatTap = async () => {
              setActiveCatId(cat.id);
              setBuilderData(null); // Close builder on category change
              if (cat.builder && (cat.slug === 'pain-frites' || cat.id === 'pain_frites')) {
                try {
                  const fullCats = await menuApi.loadFull();
                  for (const c of fullCats) {
                    if (c.slug === cat.slug || c.nameKey === cat.nameKey) {
                      for (const prod of c.items) {
                        if (prod.builderConfig) { openBuilder(prod.id); return; }
                      }
                      if (c.items.length > 0) { openBuilder(c.items[0].id); return; }
                    }
                  }
                } catch (e) { console.error(e); }
              }
            };
            return (
              <button key={cat.id} onClick={handleCatTap}
                className={`w-full py-5 text-center transition-colors border-l-4 ${
                  cat.id === activeCatId
                    ? 'bg-brand/10 border-brand text-brand-light'
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

          {/* ═══ HERO BANNER ═══ */}
          <div className="mb-4 relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/40 via-amber-800/20 to-zinc-900 border border-brand/20 p-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 rounded-full blur-3xl" />
            <div className="relative flex items-center gap-5">
              <div className="flex-1">
                <span className="inline-block px-3 py-1 rounded-full bg-brand/20 text-brand-light text-[10px] font-black uppercase tracking-wider mb-2">⭐ Best-seller</span>
                <h2 className="text-2xl font-black text-white leading-tight">Pain-frites classique</h2>
                <p className="text-sm text-zinc-400 mt-1">Pain + Frites + Viande + Sauce</p>
                <p className="text-lg font-extrabold text-brand-light mt-2">A partir de 5,00 €</p>
              </div>
              <div className="shrink-0 flex flex-col items-center gap-2">
                <span className="text-5xl">🥖🍟</span>
                <button onClick={() => {
                  const pfCat = categories.find((c) => c.slug === 'pain-frites' || c.nameKey === 'pain_frites');
                  if (pfCat) {
                    setActiveCatId(pfCat.id);
                    menuApi.loadFull().then((fullCats: any[]) => {
                      for (const c of fullCats) {
                        for (const prod of c.items) {
                          if (prod.builderConfig) { openBuilder(prod.id); return; }
                        }
                      }
                    }).catch(() => {});
                  }
                }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand to-orange-500 text-zinc-950 font-black text-sm active:scale-95 shadow-lg shadow-brand/30">
                  Commander →
                </button>
              </div>
            </div>
          </div>

          {/* Builder category with no items: show big compose button */}
          {activeItems.length === 0 && categories.find((c) => c.id === activeCatId)?.builder && (
            <div className="flex items-center justify-center h-full">
              <button
                onClick={async () => {
                  const ac = categories.find((c) => c.id === activeCatId);
                  try {
                    const fullCats = await menuApi.loadFull();
                    for (const c of fullCats) {
                      if (c.slug === ac?.slug || c.nameKey === ac?.nameKey) {
                        for (const prod of c.items) {
                          if (prod.builderConfig) { openBuilder(prod.id); return; }
                        }
                        if (c.items.length > 0) { openBuilder(c.items[0].id); return; }
                      }
                    }
                  } catch (e) { console.error(e); }
                }}
                className="px-12 py-8 rounded-3xl bg-brand/10 border-2 border-brand/30 text-center hover:bg-brand/20 transition-all active:scale-95"
              >
                <span className="text-7xl block mb-4">{categories.find((c) => c.id === activeCatId)?.icon}</span>
                <p className="text-2xl font-bold text-white">{t.ui.pos_composeA} Pain-frites</p>
                <p className="text-base text-zinc-400 mt-2">{t.ui.pos_clickToStart}</p>
              </button>
            </div>
          )}

          {activeItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeItems.map((item) => {
                const inCart = cart.find((c) => c.menuItemId === item.id);
                const activeCatSlug = categories.find((c) => c.id === activeCatId)?.slug;
                const isCustomizable = activeCatSlug === 'pains-ronds' || activeCatSlug === 'grillades' || activeCatSlug === 'magic-box';
                const isPopular = item.tags?.includes('popular');
                const isNew = item.tags?.includes('new');
                const kioskPhoto = getCloudinaryUrl((item as any).imageUrl, 'kiosk-tile');
                return (
                  <button key={item.id}
                    onClick={() => handleItemTapKiosk(item)}
                    className={`relative rounded-2xl border-2 text-left transition-all active:scale-[0.97] overflow-hidden ${
                      inCart
                        ? 'bg-gradient-to-br from-brand/15 to-orange-500/10 border-brand/40 shadow-lg shadow-brand/10'
                        : isPopular
                          ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-brand/20 hover:border-brand/40'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                    }`}>
                    {kioskPhoto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={kioskPhoto} alt="" loading="lazy" className="w-full aspect-square object-cover" />
                    )}
                    <div className="flex gap-1.5 px-4 pt-3">
                      {isPopular && <span className="px-2 py-0.5 rounded-full bg-brand/20 text-brand-light text-[9px] font-black">⭐ POPULAIRE</span>}
                      {isNew && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black">NOUVEAU</span>}
                      {activeCatSlug === 'magic-box' && <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[9px] font-black">MENU</span>}
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-base font-bold text-white leading-snug">{getItemName(item.id, item.name)}</p>
                    </div>
                    <div className="flex items-center justify-between px-4 pb-4">
                      <p className="text-xl text-brand-light font-extrabold">
                        {item.sizes
                          ? `${formatPrice(item.sizes[0].price)} €`
                          : item.price != null ? `${formatPrice(item.price)} €` : ''}
                      </p>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                        isCustomizable ? 'bg-brand/10 text-brand-light' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {isCustomizable ? 'Composer →' : '+ Ajouter'}
                      </span>
                    </div>
                    {inCart && (
                      <span className="absolute -top-1 -right-1 w-10 h-10 rounded-full bg-brand text-zinc-950 text-lg font-black flex items-center justify-center shadow-lg shadow-brand/30">
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
              <span className="text-2xl font-extrabold text-brand-light ml-4">{formatPrice(total)} €</span>
            </div>
            <button onClick={() => setStep('cart')}
              className="px-8 py-4 rounded-2xl bg-brand text-zinc-950 font-extrabold text-base active:scale-95 shadow-lg shadow-brand/20">
              {t.ui.kiosk_seeCart} →
            </button>
          </div>
        </div>
      )}

      {/* ═══ CART OVERLAY ═══ */}
      {step === 'cart' && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
          <header className="flex items-center justify-between px-6 h-16 bg-zinc-900 border-b border-zinc-800 shrink-0">
            <button onClick={() => setStep('menu')} className="text-brand-light font-bold text-base">← {t.ui.kiosk_modify}</button>
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
                  <span className="text-lg text-brand-light font-extrabold w-20 text-right">{formatPrice(item.price * item.quantity)} €</span>
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-5 bg-zinc-900 border-t border-zinc-800 space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-white">{t.ui.kiosk_total}</span>
              <span className="text-3xl font-black text-brand-light">{formatPrice(total)} €</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('menu')}
                className="flex-1 py-4 rounded-2xl bg-zinc-800 text-white font-bold text-base active:scale-95">
                + {t.ui.kiosk_addMore}
              </button>
              <button onClick={handleSubmit} disabled={submitting || cart.length === 0}
                className="flex-1 py-4 px-8 rounded-2xl bg-gradient-to-r from-brand to-orange-500 text-zinc-950 font-extrabold text-lg active:scale-[0.97] transition-transform disabled:opacity-50 shadow-lg shadow-brand/20">
                {submitting ? '...' : t.ui.kiosk_validate}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SIZE POPUP (with sel/épicé for frites) ═══ */}
      {sizePopup && (() => {
        const isFrites = sizePopup.id === 'frites' || activeCatId === 'frites';
        const SizePopupContent = () => {
          const [sel, setSel] = useState(true);
          const [epice, setEpice] = useState(false);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setSizePopup(null)}>
              <div className="bg-zinc-900 rounded-3xl border-2 border-zinc-700 p-8 w-full max-w-sm mx-4 space-y-4 animate-scale-in" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <h3 className="text-xl font-extrabold text-white text-center">{getItemName(sizePopup.id, sizePopup.name)}</h3>
                {isFrites && (
                  <div className="flex gap-3">
                    <button onClick={() => setSel(!sel)}
                      className={`flex-1 py-3 rounded-xl border-2 text-center text-sm font-bold active:scale-95 ${
                        sel ? 'bg-brand/15 text-brand-light border-brand/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }`}>
                      🧂 Sel
                    </button>
                    <button onClick={() => setEpice(!epice)}
                      className={`flex-1 py-3 rounded-xl border-2 text-center text-sm font-bold active:scale-95 ${
                        epice ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }`}>
                      🌶 Epice
                    </button>
                  </div>
                )}
                <p className="text-sm text-zinc-500 text-center">{t.ui.kiosk_chooseSize || 'Choisissez la taille'}</p>
                <div className="space-y-3">
                  {sizePopup.sizes?.map((size) => (
                    <button key={size.sizeKey}
                      onClick={() => {
                        if (isFrites) {
                          addFrites(sizePopup, size.sizeKey, { sel, epice });
                        } else {
                          addToCart(sizePopup, size.sizeKey);
                          setSizePopup(null);
                        }
                      }}
                      className="w-full py-5 rounded-2xl bg-zinc-800 border-2 border-zinc-700 text-white font-bold text-lg hover:border-brand/40 active:scale-95 transition-all flex items-center justify-between px-6">
                      <span className="capitalize">{size.sizeKey}</span>
                      <span className="text-brand-light font-extrabold">{formatPrice(size.price)} €</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        };
        return <SizePopupContent />;
      })()}
      {/* ═══ UPSELL BOISSON ═══ */}
      {showUpsell && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowUpsell(false)}>
          <div className="bg-zinc-900 rounded-t-3xl border-t-2 border-brand/30 p-6 w-full max-w-lg mx-4 mb-0 space-y-4 animate-slide-up" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="text-center">
              <span className="text-4xl block mb-2">🥤</span>
              <h3 className="text-xl font-extrabold text-white">Ajouter une boisson ?</h3>
              <p className="text-sm text-zinc-400 mt-1">Completez votre commande</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {categories.find((c) => c.id === 'boissons' || c.nameKey === 'boissons')
                ?.items.filter((i) => !i.unavailable).slice(0, 6)
                .map((drink) => (
                    <button key={drink.id}
                      onClick={() => {
                        setCart((prev) => [...prev, { id: drink.id, menuItemId: drink.id, name: getItemName(drink.id, drink.name), price: drink.price || 0, quantity: 1, categoryId: 'boissons' }]);
                        setShowUpsell(false);
                      }}
                      className="py-4 rounded-xl bg-zinc-800 border border-zinc-700 text-center hover:border-brand/30 active:scale-95 transition-all">
                      <p className="text-sm font-bold text-white">{getItemName(drink.id, drink.name).split('/')[0]}</p>
                      <p className="text-xs text-brand-light font-bold mt-1">{formatPrice(drink.price || 0)} €</p>
                    </button>
                ))}
            </div>
            <button onClick={() => setShowUpsell(false)}
              className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-400 font-medium text-sm">
              Non merci
            </button>
          </div>
        </div>
      )}

      {/* Idle timeout warning */}
      {idleWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 rounded-3xl border border-brand/30 p-8 text-center max-w-sm animate-pulse">
            <span className="text-6xl block mb-4">⏰</span>
            <h2 className="text-2xl font-bold text-white mb-2">{t.ui.kiosk_stillThere || 'Êtes-vous encore là ?'}</h2>
            <p className="text-zinc-400 mb-6">{t.ui.kiosk_idleWarning || 'Votre commande va être annulée dans quelques secondes.'}</p>
            <button onClick={() => { resetIdle(); }}
              className="px-8 py-4 rounded-2xl bg-brand text-zinc-950 font-extrabold text-lg active:scale-95">
              {t.ui.kiosk_continue || 'Oui, je continue !'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Generic Builder modal ─── */}
      {builderData && (
        <GenericBuilder
          product={builderData.product}
          builderConfig={builderData.builderConfig}
          modifierGroups={builderData.modifierGroups}
          allowSimpleAdd={builderData.allowSimpleAdd}
          onClose={() => setBuilderData(null)}
          onAdd={handleBuilderAdd}
        />
      )}
      {builderLoading && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center">
          <div className="bg-zinc-900 rounded-xl px-6 py-4 text-white text-sm">Chargement...</div>
        </div>
      )}
    </div>
  );
}

// ─── Suspense wrapper ───
function KioskGate() {
  const enabled = useModule('kiosk');
  if (!enabled) return <FeatureDisabledPage module="Kiosk" />;
  return <KioskContent />;
}

export default function KioskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><span className="text-8xl animate-pulse">🍟</span></div>}>
      <KioskGate />
    </Suspense>
  );
}
