'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { menuStore } from '@/stores/menuStore';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { api } from '@/lib/api';
import { formatPrice } from '@/utils/format';
import { getCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { Category, MenuItem } from '@/types';
import { CartExtra } from '@/types/order';
import OrderReceipt from '@/components/OrderReceipt';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import GenericBuilder from '@/components/GenericBuilder';
import NumPad from '@/components/pos/NumPad';
import DiscountModal from '@/components/pos/DiscountModal';
import CheckoutModal from '@/components/pos/CheckoutModal';
import { menuApi } from '@/lib/menuApi';
import { setOnAuthExpired } from '@/lib/api';
import TicketPrint from '@/components/TicketPrint';
import { useTenant, useModule } from '@/contexts/TenantContext';
import { FeatureDisabledPage } from '@/components/FeatureGate';

// ─── Types ───

interface POSCartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  sizeKey?: string;
  categoryId: string;
  extras?: CartExtra[];
  lineDiscount?: number;
  lineDiscountReason?: string;
}

interface OpenTicket {
  id: string;
  label: string;           // "Table 5", "Comptoir", "Ticket #3"
  items: POSCartItem[];
  discount?: { amount: number; reason: string } | null;
  createdAt: number;
}

// ─── POS Content ───

function POSContent() {
  const { t, getCategory, getItemName } = useLanguage();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { locationId } = useLocation();
  const [isOnline, setIsOnline] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    setIsOnline(navigator.onLine);
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'OFFLINE_QUEUE_COUNT') setOfflineCount(e.data.count || 0);
      if (e.data?.type === 'OFFLINE_SYNC_DONE') setOfflineCount(0);
    };
    navigator.serviceWorker?.addEventListener('message', handleMsg);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      navigator.serviceWorker?.removeEventListener('message', handleMsg);
    };
  }, []);

  useEffect(() => {
    if (isOnline && offlineCount > 0) {
      navigator.serviceWorker?.controller?.postMessage({ type: 'FLUSH_OFFLINE_QUEUE' });
    }
  }, [isOnline, offlineCount]);

  // ─── Menu & categories ───
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);

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

  // ─── Tickets system ───
  const [tickets, setTickets] = useState<OpenTicket[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(sessionStorage.getItem('pos-tickets') || '[]'); } catch { return []; }
  });
  const [activeTicketId, setActiveTicketId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('pos-active-ticket') || null;
  });
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicketLabel, setNewTicketLabel] = useState('');

  // Persist tickets
  useEffect(() => {
    sessionStorage.setItem('pos-tickets', JSON.stringify(tickets));
  }, [tickets]);
  useEffect(() => {
    if (activeTicketId) sessionStorage.setItem('pos-active-ticket', activeTicketId);
    else sessionStorage.removeItem('pos-active-ticket');
  }, [activeTicketId]);

  // Active ticket's cart = derived from tickets
  const activeTicket = tickets.find((t) => t.id === activeTicketId) || null;
  const cart = activeTicket?.items || [];
  const ticketDiscount = activeTicket?.discount || null;

  // Create a new ticket
  const createTicket = (label: string) => {
    const id = `ticket_${Date.now()}`;
    const newTicket: OpenTicket = { id, label: label || `Ticket #${tickets.length + 1}`, items: [], discount: null, createdAt: Date.now() };
    setTickets((prev) => [...prev, newTicket]);
    setActiveTicketId(id);
    setShowNewTicket(false);
    setNewTicketLabel('');
  };

  // Auto-create default ticket if none exists
  useEffect(() => {
    if (tickets.length === 0) {
      createTicket('Comptoir');
    } else if (!activeTicketId || !tickets.find((t) => t.id === activeTicketId)) {
      setActiveTicketId(tickets[0].id);
    }
  }, [tickets, activeTicketId]);

  // Update cart = update active ticket's items
  const setCart = useCallback((updater: POSCartItem[] | ((prev: POSCartItem[]) => POSCartItem[])) => {
    setTickets((prev) => prev.map((t) => {
      if (t.id !== activeTicketId) return t;
      const newItems = typeof updater === 'function' ? updater(t.items) : updater;
      return { ...t, items: newItems };
    }));
  }, [activeTicketId]);

  // Set ticket discount
  const setTicketDiscount = useCallback((discount: { amount: number; reason: string } | null) => {
    setTickets((prev) => prev.map((t) => t.id === activeTicketId ? { ...t, discount } : t));
  }, [activeTicketId]);

  // Close (remove) a ticket after checkout
  const closeTicket = useCallback((ticketId: string) => {
    setTickets((prev) => {
      const remaining = prev.filter((t) => t.id !== ticketId);
      // Schedule active ticket switch on next tick to avoid stale reads
      setTimeout(() => {
        setActiveTicketId((currentId) => {
          if (currentId === ticketId) {
            return remaining.length > 0 ? remaining[0].id : null;
          }
          return currentId;
        });
      }, 0);
      return remaining;
    });
  }, []);

  // ─── NumPad state ───
  const [numpadValue, setNumpadValue] = useState('0');
  const [pendingQuantity, setPendingQuantity] = useState<number | null>(null);

  // ─── Discount modal ───
  const [showDiscountModal, setShowDiscountModal] = useState<'percent' | 'euro' | null>(null);
  const [lineDiscountItemId, setLineDiscountItemId] = useState<string | null>(null);

  // Apply discount to a specific line
  const applyLineDiscount = useCallback((itemId: string, amount: number, reason: string) => {
    setCart((prev) => prev.map((c) => c.id === itemId ? { ...c, lineDiscount: amount, lineDiscountReason: reason } : c));
    setLineDiscountItemId(null);
  }, [setCart]);

  // ─── Checkout ───
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSizePopup, setShowSizePopup] = useState<MenuItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<string | null>(null);
  const [lastOrderData, setLastOrderData] = useState<any>(null);
  const [printTicket, setPrintTicket] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'kitchen' | 'client' | null>(null);

  // ─── Auth expiry detection ───
  const [authExpired, setAuthExpired] = useState(false);
  useEffect(() => {
    setOnAuthExpired(() => setAuthExpired(true));
    return () => setOnAuthExpired(null);
  }, []);

  // ─── Ref for stable ticket ID access (avoids stale closures in callbacks) ───
  const activeTicketIdRef = useRef(activeTicketId);
  useEffect(() => { activeTicketIdRef.current = activeTicketId; }, [activeTicketId]);

  // ─── Builder ───
  const [builderData, setBuilderData] = useState<any>(null);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderLoadError, setBuilderLoadError] = useState(false);
  const [builderProductIds, setBuilderProductIds] = useState<Record<string, string>>({});
  const [builderCache, setBuilderCache] = useState<Record<string, any>>({});

  // Preload builder data for all composable products (background, no blocking)
  useEffect(() => {
    menuApi.loadFull().then((cats: any[]) => {
      const ids: Record<string, string> = {};
      for (const cat of cats) {
        if (cat.slug === 'pain-frites' || cat.nameKey === 'pain_frites') {
          for (const item of cat.items) {
            if (item.builderConfig) ids[cat.slug] = item.id;
          }
          if (!ids[cat.slug] && cat.items.length > 0) ids[cat.slug] = cat.items[0].id;
        }
      }
      setBuilderProductIds(ids);

      // Preload builder data for known builder products
      const productIds = new Set<string>();
      for (const cat of cats) {
        for (const item of cat.items) {
          if (item.builderConfig || item.modifierLinks?.length > 0) {
            productIds.add(item.id);
          }
        }
      }
      // Load first 10 builder products in background
      const toLoad = Array.from(productIds).slice(0, 10);
      Promise.all(toLoad.map((pid: string) =>
        menuApi.getBuilderData(pid).then((data: any) => ({ pid, data })).catch(() => null)
      )).then((results) => {
        const cache: Record<string, any> = {};
        for (const r of results) {
          if (r) cache[r.pid] = r.data;
        }
        setBuilderCache(cache);
      });
    }).catch(() => {});
  }, []);

  // ─── Totals ───
  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity) - (i.lineDiscount || 0), 0);
  const total = Math.max(0, subtotal - (ticketDiscount?.amount || 0));
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // ─── Cart operations ───
  const addToCart = useCallback((item: MenuItem, sizeKey?: string, catId?: string) => {
    const price = sizeKey
      ? item.sizes?.find((s) => s.sizeKey === sizeKey)?.price || item.price || 0
      : item.price || 0;
    const key = sizeKey ? `${item.id}__${sizeKey}` : item.id;
    const name = getItemName(item.id, item.name) + (sizeKey ? ` (${sizeKey})` : '');
    const qty = pendingQuantity || 1;

    setCart((prev) => {
      const existing = prev.find((c) => c.id === key);
      if (existing && qty === 1) {
        return prev.map((c) => c.id === key ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { id: key, menuItemId: item.id, name, price, quantity: qty, sizeKey, categoryId: catId || activeCatId || '' }];
    });
    setPendingQuantity(null);
    setNumpadValue('0');
  }, [activeCatId, getItemName, pendingQuantity]);

  // Add frites with size + sel/épicé (independent toggles, like pain-frites builder)
  const addFrites = useCallback((item: MenuItem, sizeKey: string, opts: { sel: boolean; epice: boolean }) => {
    const price = item.sizes?.find((s) => s.sizeKey === sizeKey)?.price || item.price || 0;
    const labels: string[] = [];
    const extras: { name: string; price: number }[] = [];
    if (opts.sel) { labels.push('Sel'); extras.push({ name: 'Sel', price: 0 }); }
    if (opts.epice) { labels.push('Epice'); extras.push({ name: 'Epice', price: 0 }); }
    const labelStr = labels.length > 0 ? labels.join('+') : 'Nature';
    const name = `${getItemName(item.id, item.name)} (${sizeKey}) ${labelStr}`;
    const key = `${item.id}__${sizeKey}__${labelStr}`;
    const qty = pendingQuantity || 1;

    setCart((prev) => {
      const existing = prev.find((c) => c.id === key);
      if (existing && qty === 1) {
        return prev.map((c) => c.id === key ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { id: key, menuItemId: item.id, name, price, quantity: qty, sizeKey, categoryId: 'frites', extras }];
    });
    setPendingQuantity(null);
    setNumpadValue('0');
  }, [getItemName, pendingQuantity, setCart]);

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, quantity: c.quantity + delta } : c).filter((c) => c.quantity > 0));
  };
  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));
  const clearCart = () => { setCart([]); setTicketDiscount(null); setPendingQuantity(null); setNumpadValue('0'); };
  const clearAndCloseTicket = () => {
    if (activeTicketId) closeTicket(activeTicketId);
    setPendingQuantity(null);
    setNumpadValue('0');
  };

  // ─── NumPad actions ───
  const handleQuantity = () => {
    const qty = parseInt(numpadValue);
    if (qty > 0 && qty <= 99) {
      setPendingQuantity(qty);
      setNumpadValue('0');
    }
  };

  const handleFreePrice = () => {
    const price = parseFloat(numpadValue);
    if (price > 0) {
      setCart((prev) => [...prev, {
        id: `libre_${Date.now()}`,
        menuItemId: 'libre',
        name: `Divers`,
        price,
        quantity: 1,
        categoryId: 'libre',
      }]);
      setNumpadValue('0');
    }
  };

  // ─── Builder ───
  const openBuilder = useCallback(async (productId: string, opts?: { allowSimpleAdd?: boolean }) => {
    // Check cache first (instant, no API call)
    const cached = builderCache[productId];
    if (cached?.product) {
      setBuilderData({ product: cached.product, builderConfig: cached.builderConfig, modifierGroups: cached.modifierGroups, allowSimpleAdd: opts?.allowSimpleAdd });
      return;
    }

    setBuilderLoading(true);
    setBuilderLoadError(false);
    try {
      const data = await menuApi.getBuilderData(productId);
      if (!data?.product) throw new Error('No product data');
      setBuilderData({ product: data.product, builderConfig: data.builderConfig, modifierGroups: data.modifierGroups, allowSimpleAdd: opts?.allowSimpleAdd });
      // Update cache for next time
      setBuilderCache((prev) => ({ ...prev, [productId]: data }));
    } catch (e) {
      console.error('Failed to load builder:', e);
      setBuilderLoadError(true);
      setTimeout(() => setBuilderLoadError(false), 3000);
    }
    setBuilderLoading(false);
  }, [builderCache]);

  const resolveBuilderProductId = useCallback(async (catSlug: string): Promise<string | null> => {
    if (builderProductIds[catSlug]) return builderProductIds[catSlug];
    try {
      const cats = await menuApi.loadFull();
      for (const cat of cats) {
        if (cat.slug === catSlug || cat.nameKey === catSlug.replace(/-/g, '_')) {
          for (const item of cat.items) {
            if (item.builderConfig) {
              setBuilderProductIds((prev) => ({ ...prev, [catSlug]: item.id }));
              return item.id;
            }
          }
          if (cat.items.length > 0) {
            setBuilderProductIds((prev) => ({ ...prev, [catSlug]: cat.items[0].id }));
            return cat.items[0].id;
          }
        }
      }
    } catch (e) { console.error(e); }
    return null;
  }, [builderProductIds]);

  const resolveProductAndOpenBuilder = useCallback(async (item: MenuItem, allowSimple: boolean) => {
    try {
      const cats = await menuApi.loadFull();
      const activeSlug = activeCat?.slug;
      if (activeSlug) {
        for (const cat of cats) {
          if (cat.slug === activeSlug || cat.nameKey === activeCat?.nameKey) {
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
  }, [openBuilder, addToCart, activeCat]);

  const handleBuilderAdd = useCallback((builderItem: { menuItemId: string; name: string; price: number; categoryId: string; extras?: CartExtra[] }) => {
    const extrasLabel = builderItem.extras?.length ? ` (${builderItem.extras.map((e) => e.name).join(', ')})` : '';
    // Read activeTicketId from ref to always get latest value
    const ticketId = activeTicketIdRef.current;
    setTickets((prev) => prev.map((t) => {
      if (t.id !== ticketId) return t;
      return { ...t, items: [...t.items, {
        id: `${builderItem.menuItemId}_${Date.now()}`,
        menuItemId: builderItem.menuItemId,
        name: builderItem.name + extrasLabel,
        price: builderItem.price,
        quantity: 1,
        categoryId: builderItem.categoryId,
        extras: builderItem.extras,
      }] };
    }));
  }, []); // No deps needed — reads from ref

  // ─── Category & item handlers ───
  const handleCategoryTap = async (catId: string) => {
    setActiveCatId(catId);
    // Changing category ALWAYS closes the builder — navigation has priority
    setBuilderData(null);

    const cat = categories.find((c) => c.id === catId);
    if (cat?.builder || cat?.slug === 'pain-frites') {
      const slug = cat?.slug || 'pain-frites';
      const productId = await resolveBuilderProductId(slug);
      if (productId) openBuilder(productId);
    }
  };

  const handleItemTap = (item: MenuItem) => {
    if (activeCat?.slug === 'pains-ronds' || activeCat?.slug === 'grillades') {
      resolveProductAndOpenBuilder(item, true);
      return;
    }
    if (activeCat?.slug === 'magic-box') {
      resolveProductAndOpenBuilder(item, false);
      return;
    }
    if (item.sizes && item.sizes.length > 0) {
      setShowSizePopup(item);
    } else {
      addToCart(item);
    }
  };

  // ─── Checkout ───
  const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null); // Idempotency guard

  const handleSubmitOrder = async (data: { orderType: string; customerName: string; payments: { method: string; amount: number }[] }) => {
    // Read cart items directly from tickets state to avoid stale closure
    const currentTicket = tickets.find((t) => t.id === activeTicketId);
    const currentItems = currentTicket?.items || [];
    const currentDiscount = currentTicket?.discount;
    const currentTotal = Math.max(0, currentItems.reduce((s, i) => s + (i.price * i.quantity) - (i.lineDiscount || 0), 0) - (currentDiscount?.amount || 0));

    if (currentItems.length === 0 || submitting) return;

    // Idempotency: prevent duplicate submission of same ticket
    const idempotencyKey = `pos_${activeTicketId}_${currentTotal}_${currentItems.length}`;
    if (checkoutOrderId === idempotencyKey) {
      setOrderError('Commande déjà envoyée. Fermez et rouvrez le ticket si nécessaire.');
      return;
    }

    setSubmitting(true);
    setOrderError(null);
    try {
      const primaryPayment = data.payments[0];
      const order = await api.post<any>('/orders', {
        action: 'create',
        type: data.orderType,
        customerName: data.customerName,
        customerPhone: '',
        customerEmail: null,
        deliveryNotes: data.orderType === 'dine_in' ? 'Sur place' : null,
        // POS cashing = payment taken at the counter. Always mark as paid.
        // 'on_pickup' (pay later at pickup) is legacy from delivery flows and
        // was confusing: a cash sale showed "Non payé" in the orders list.
        paymentMethod: primaryPayment.method === 'cash' ? 'cash' : 'card',
        paymentStatus: 'paid',
        total: currentTotal,
        userId: user?.id || null,
        locationId: locationId || null,
        items: currentItems.map((c) => ({
          menuItemId: c.menuItemId,
          name: c.name,
          price: c.price,
          quantity: c.quantity,
          sizeKey: c.sizeKey || null,
          categoryId: c.categoryId,
          extras: c.extras ? JSON.stringify(c.extras) : '[]',
        })),
      });
      setCheckoutOrderId(idempotencyKey); // Mark as submitted
      setLastOrder(order.orderNumber);
      setLastOrderData(order);
      // Trigger ticket print sequence: kitchen → client
      setPrintMode('kitchen');
      setPrintTicket({
        orderNumber: order.orderNumber,
        type: data.orderType,
        customerName: data.customerName,
        items: order.items || currentItems.map((c) => ({ name: c.name, quantity: c.quantity, price: c.price, extras: c.extras ? JSON.stringify(c.extras) : '[]' })),
        total: currentTotal,
        paymentMethod: primaryPayment.method,
        createdAt: order.createdAt,
      });
      clearAndCloseTicket();
      setShowCheckout(false);
      setTimeout(() => { setLastOrder(null); setCheckoutOrderId(null); }, 5000);
    } catch (e: any) {
      // Ticket is preserved on failure — user can retry
      const msg = e?._status === 401
        ? 'Session expirée. Reconnectez-vous.'
        : (e?.error || 'Erreur réseau. Le ticket est préservé, réessayez.');
      setOrderError(msg);
    }
    setSubmitting(false);
  };

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCheckout) { setShowCheckout(false); setOrderError(null); }
        if (showSizePopup) setShowSizePopup(null);
        if (builderData) setBuilderData(null);
        if (showDiscountModal) setShowDiscountModal(null);
      }
      if (e.key === 'F2' && cart.length > 0 && !showCheckout) { e.preventDefault(); setShowCheckout(true); }
      if (e.key === 'Delete' && !showCheckout) clearCart();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showCheckout, showSizePopup, builderData, showDiscountModal, cart.length]);

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <div className="dark h-screen flex flex-col bg-zinc-950 text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 h-12 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          {tenant?.branding?.faviconUrl || tenant?.branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.branding.faviconUrl || tenant.branding.logoUrl} alt={tenant.branding.brandName || tenant.name || 'Restaurant'} className="h-6 w-6 object-contain" />
          ) : null}
          <span className="text-sm font-bold text-white truncate max-w-[12rem]">
            {tenant?.branding?.brandName || tenant?.name || 'Caisse POS'}
          </span>
          {user && <span className="text-xs text-zinc-500">{user.name}</span>}
        </div>
        <div className="flex items-center gap-3">
          {!isOnline && <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold animate-pulse">Hors ligne</span>}
          {offlineCount > 0 && <span className="px-2 py-1 rounded bg-brand/20 text-brand-light text-xs font-bold">{offlineCount} en attente</span>}
          {lastOrder && <span className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold animate-pulse">✓ {lastOrder}</span>}
          {pendingQuantity && <span className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-bold">Qty: x{pendingQuantity}</span>}
          <a href="/admin" className="text-xs text-zinc-500 hover:text-white">Admin ↗</a>
        </div>
      </header>

      {/* Ticket tabs bar */}
      <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900/80 border-b border-zinc-800 shrink-0 overflow-x-auto">
        {tickets.map((ticket) => {
          const isActive = ticket.id === activeTicketId;
          const ticketTotal = ticket.items.reduce((s, i) => s + i.price * i.quantity, 0) - (ticket.discount?.amount || 0);
          return (
            <button key={ticket.id} onClick={() => setActiveTicketId(ticket.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                isActive ? 'bg-brand/15 text-brand-light border border-brand/30' : 'bg-zinc-800/50 text-zinc-400 border border-transparent hover:bg-zinc-800'
              }`}>
              <span>{ticket.label}</span>
              {ticket.items.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-brand/20' : 'bg-zinc-700'}`}>
                  {ticket.items.length} · {formatPrice(Math.max(0, ticketTotal))}€
                </span>
              )}
            </button>
          );
        })}
        <button onClick={() => setShowNewTicket(true)}
          className="px-2 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-brand-light hover:bg-zinc-800 shrink-0">
          + Ticket
        </button>

        {/* New ticket: table quick-select + custom name */}
        {showNewTicket && (
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {[1,2,3,4,5,6,7,8,9].map((n) => {
              const taken = tickets.some((t) => t.label === `Table ${n}`);
              return (
                <button key={n} onClick={() => !taken && createTicket(`Table ${n}`)} disabled={taken}
                  className={`w-7 h-7 rounded text-[10px] font-bold flex items-center justify-center ${
                    taken ? 'bg-zinc-800 text-zinc-600' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                  }`}>
                  {n}
                </button>
              );
            })}
            <span className="text-zinc-600 text-xs mx-0.5">|</span>
            <input
              className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-white text-xs w-24 focus:outline-none focus:border-brand/50"
              placeholder="Autre..."
              value={newTicketLabel}
              onChange={(e) => setNewTicketLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newTicketLabel) createTicket(newTicketLabel); if (e.key === 'Escape') setShowNewTicket(false); }}
            />
            {newTicketLabel && <button onClick={() => createTicket(newTicketLabel)} className="text-xs text-brand-light font-bold px-1">OK</button>}
            <button onClick={() => setShowNewTicket(false)} className="text-xs text-zinc-500 px-1">✕</button>
          </div>
        )}
      </div>

      {/* Main: 4 zones */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Categories */}
        <div className="w-20 sm:w-24 bg-zinc-900/50 border-r border-zinc-800 overflow-y-auto shrink-0">
          {categories.map((cat) => {
            const isActive = cat.id === activeCatId;
            return (
              <button key={cat.id} onClick={() => handleCategoryTap(cat.id)}
                className={`w-full py-3 px-1 text-center transition-colors border-l-3 ${
                  isActive ? 'bg-brand/10 border-brand text-brand-light' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}>
                <span className="text-xl block">{cat.icon}</span>
                <span className="text-[10px] font-medium block mt-1 leading-tight">{getCategory(cat.nameKey)}</span>
                {cat.builder && <span className="text-[8px] text-brand-light/60 block">Composer</span>}
              </button>
            );
          })}
        </div>

        {/* CENTER: Items grid OR Builder inline */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Builder inline (replaces grid when composing) */}
          {builderData && (
            <GenericBuilder
              product={builderData.product}
              builderConfig={builderData.builderConfig}
              modifierGroups={builderData.modifierGroups}
              allowSimpleAdd={builderData.allowSimpleAdd}
              mode="inline"
              initialSelections={builderData.initialSelections}
              initialOptions={builderData.initialOptions}
              initialStep={builderData.initialStep}
              onClose={() => setBuilderData(null)}
              onAdd={handleBuilderAdd}
            />
          )}

          {/* Normal product grid (hidden when builder is open) */}
          {!builderData && (
          <div className="flex-1 overflow-y-auto p-2">

          {/* ─── Raccourcis favoris (max 7, toujours visibles, 1 tap) ─── */}
          {/* The 3 "pain-frites" combo shortcuts only make sense when the tenant
              actually has that category. Without this gate a brand-new restaurant
              saw 2H Frites combo buttons on their POS — revenue/UX leak. */}
          <div className="flex gap-1 mb-2">
            {categories.some((c) => c.slug === 'pain-frites' || c.id === 'pain-frites' || c.id === 'pain_frites') && (
              <>
                {/* Combo: Pain-frites classique (Hamburger + Andalouse + Sel) → summary */}
                <button onClick={async () => {
                  const pid = await resolveBuilderProductId('pain-frites');
                  if (!pid) return;
                  const cached = builderCache[pid];
                  const data = cached || await menuApi.getBuilderData(pid);
                  if (!cached && data) setBuilderCache((prev) => ({ ...prev, [pid]: data }));
                  if (data?.product) {
                    setBuilderData({
                      product: data.product,
                      builderConfig: data.builderConfig,
                      modifierGroups: data.modifierGroups,
                      initialSelections: { meat: ['hamburger_v'], sauce: ['sauce_andalouse'] },
                      initialOptions: { frites: ['salt'] },
                      initialStep: 4, // summary (steps: frites, meat, sauce, toppings, summary)
                    });
                  }
                }}
                  className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400 active:scale-95">
                  ⚡ Classique
                </button>
                {/* Combo: Pain-frites Fricadelle (Fricadelle + Andalouse + Sel) → summary */}
                <button onClick={async () => {
                  const pid = await resolveBuilderProductId('pain-frites');
                  if (!pid) return;
                  const cached = builderCache[pid];
                  const data = cached || await menuApi.getBuilderData(pid);
                  if (!cached && data) setBuilderCache((prev) => ({ ...prev, [pid]: data }));
                  if (data?.product) {
                    setBuilderData({
                      product: data.product,
                      builderConfig: data.builderConfig,
                      modifierGroups: data.modifierGroups,
                      initialSelections: { meat: ['fricadelle'], sauce: ['sauce_andalouse'] },
                      initialOptions: { frites: ['salt'] },
                      initialStep: 4,
                    });
                  }
                }}
                  className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400 active:scale-95">
                  ⚡ Fricadelle
                </button>
                <button onClick={async () => { const pid = await resolveBuilderProductId('pain-frites'); if (pid) openBuilder(pid); }}
                  className="px-3 py-2 rounded-lg bg-brand/10 border border-brand/30 text-xs font-bold text-brand-light active:scale-95">
                  🥖 Pain-frites
                </button>
              </>
            )}
            {(() => {
              const fritesItem = categories.find((c) => c.id === 'frites' || c.nameKey === 'frites')?.items
                .find((i) => !i.unavailable && i.sizes && i.sizes.length > 0);
              if (!fritesItem) return null;
              const moyen = fritesItem.sizes!.find((s) => s.sizeKey === 'moyen');
              const grand = fritesItem.sizes!.find((s) => s.sizeKey === 'grand');
              return (
                <>
                  {moyen && <button onClick={() => addFrites(fritesItem, 'moyen', { sel: true, epice: false })}
                    className="px-2 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold text-white active:scale-95">
                    🍟M {formatPrice(moyen.price)}
                  </button>}
                  {moyen && <button onClick={() => addFrites(fritesItem, 'moyen', { sel: false, epice: true })}
                    className="px-2 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 active:scale-95">
                    🌶M {formatPrice(moyen.price)}
                  </button>}
                  {grand && <button onClick={() => addFrites(fritesItem, 'grand', { sel: true, epice: false })}
                    className="px-2 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold text-white active:scale-95">
                    🍟G {formatPrice(grand.price)}
                  </button>}
                </>
              );
            })()}
            {['coca_cola', 'eau_plate', 'jupiler'].map((drinkId) => {
              const drink = categories.find((c) => c.id === 'boissons' || c.nameKey === 'boissons')
                ?.items.find((i) => i.id === drinkId && !i.unavailable);
              if (!drink) return null;
              return (
                <button key={drinkId} onClick={() => addToCart(drink, undefined, 'boissons')}
                  className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold text-white active:scale-95">
                  {drinkId === 'jupiler' ? '🍺' : '🥤'}{getItemName(drink.id, drink.name).split('/')[0].trim()}
                </button>
              );
            })}
          </div>

          {/* Builder compose button */}
          {activeCat?.builder && (activeCat?.slug === 'pain-frites' || activeCat?.id === 'pain_frites') && (
            <div className="flex items-center justify-center h-full">
              <button onClick={async () => { const pid = await resolveBuilderProductId(activeCat?.slug || 'pain-frites'); if (pid) openBuilder(pid); }}
                className="px-8 py-6 rounded-2xl bg-brand/10 border-2 border-brand/30 text-center hover:bg-brand/20 active:scale-95">
                <span className="text-5xl block mb-3">{activeCat?.icon}</span>
                <p className="text-lg font-bold text-white">Composer {getCategory(activeCat?.nameKey || '')}</p>
                <p className="text-sm text-zinc-400 mt-1">Cliquez pour commencer</p>
              </button>
            </div>
          )}

          {/* Regular items */}
          {!(activeCat?.builder && (activeCat?.slug === 'pain-frites' || activeCat?.id === 'pain_frites')) && activeItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
              {activeItems.map((item) => {
                const inCart = cart.find((c) => c.menuItemId === item.id);
                const hasSizes = item.sizes && item.sizes.length > 0;
                const isComposable = activeCat?.slug === 'pains-ronds' || activeCat?.slug === 'grillades' || activeCat?.slug === 'magic-box';

                const posPhoto = getCloudinaryUrl((item as any).imageUrl, 'pos-tile');
                return (
                  <div key={item.id} className={`relative rounded-lg border text-left transition-all ${
                    inCart ? 'bg-brand/10 border-brand/30' : 'bg-zinc-900 border-zinc-800'
                  }`}>
                    {/* Item name — clickable for simple items or composable items */}
                    <button onClick={() => handleItemTap(item)}
                      className="w-full p-3 pb-1 text-left active:scale-[0.98] flex items-start gap-2">
                      {posPhoto && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={posPhoto} alt="" loading="lazy" className="w-10 h-10 rounded-md object-cover shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white leading-snug">{getItemName(item.id, item.name)}</p>
                        {!hasSizes && item.price != null && (
                          <p className="text-xs text-brand-light font-bold mt-1">{formatPrice(item.price)} €</p>
                        )}
                        {isComposable && (
                          <span className="text-[9px] text-brand-light/60 mt-0.5 block">Personnaliser →</span>
                        )}
                      </div>
                    </button>

                    {/* Frites: size buttons + independent sel/épicé toggles */}
                    {hasSizes && (activeCat?.id === 'frites' || activeCat?.nameKey === 'frites') && (() => {
                      // Local state via data attributes for toggle tracking
                      const FritesSelector = () => {
                        const [sel, setSel] = useState(true);
                        const [epice, setEpice] = useState(false);
                        return (
                          <div className="px-2 pb-2 pt-0.5 space-y-1">
                            <div className="flex gap-1">
                              <button onClick={() => setSel(!sel)}
                                className={`flex-1 py-1 rounded text-[10px] font-bold active:scale-90 ${sel ? 'bg-brand/20 text-brand-light border border-brand/30' : 'bg-zinc-800 text-zinc-500 border border-transparent'}`}>
                                🧂 Sel
                              </button>
                              <button onClick={() => setEpice(!epice)}
                                className={`flex-1 py-1 rounded text-[10px] font-bold active:scale-90 ${epice ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-zinc-800 text-zinc-500 border border-transparent'}`}>
                                🌶 Epice
                              </button>
                            </div>
                            <div className="flex gap-1">
                              {item.sizes!.map((size) => (
                                <button key={size.sizeKey}
                                  onClick={() => addFrites(item, size.sizeKey, { sel, epice })}
                                  className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-center active:scale-90">
                                  <span className="text-[10px] text-zinc-400 block">{size.sizeKey.charAt(0).toUpperCase()}</span>
                                  <span className="text-[10px] text-brand-light font-bold">{formatPrice(size.price)}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      };
                      return <FritesSelector />;
                    })()}

                    {/* Inline size buttons for non-frites items */}
                    {hasSizes && activeCat?.id !== 'frites' && activeCat?.nameKey !== 'frites' && (
                      <div className="flex gap-1 px-2 pb-2 pt-0.5">
                        {item.sizes!.map((size) => (
                          <button key={size.sizeKey}
                            onClick={() => addToCart(item, size.sizeKey)}
                            className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-center active:scale-90 transition-all">
                            <span className="text-[10px] text-zinc-400 block capitalize">{size.sizeKey.charAt(0).toUpperCase()}</span>
                            <span className="text-[10px] text-brand-light font-bold">{formatPrice(size.price)}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {item.tags?.includes('popular') && (
                      <span className="absolute top-1 right-1 text-[8px] px-1 py-0.5 rounded bg-brand/20 text-brand-light">★</span>
                    )}
                    {inCart && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand text-zinc-950 text-[10px] font-bold flex items-center justify-center">{inCart.quantity}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </div>
          )}
        </div>

        {/* RIGHT: Cart + NumPad */}
        <div className="w-80 lg:w-96 bg-zinc-900/50 border-l border-zinc-800 flex flex-col shrink-0">
          {/* Cart header with ticket label */}
          <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-white">{activeTicket?.label || 'Comptoir'}</span>
              <span className="text-[10px] text-zinc-500 ml-2">{itemCount} article{itemCount > 1 ? 's' : ''}</span>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-300 font-medium">Vider</button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
            {cart.length === 0 ? (
              <p className="text-zinc-600 text-xs text-center py-6">Sélectionnez un article</p>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-800/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-zinc-500">{formatPrice(item.price)} €</p>
                    {item.lineDiscount && item.lineDiscount > 0 && (
                      <p className="text-[10px] text-purple-400">-{formatPrice(item.lineDiscount)} € {item.lineDiscountReason || ''}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded bg-zinc-700 text-white text-sm font-bold flex items-center justify-center active:scale-90">−</button>
                    <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded bg-zinc-700 text-white text-sm font-bold flex items-center justify-center active:scale-90">+</button>
                  </div>
                  <span className="text-xs text-brand-light font-bold w-14 text-right">{formatPrice(item.price * item.quantity - (item.lineDiscount || 0))} €</span>
                  <button onClick={() => setLineDiscountItemId(item.id)} className="text-zinc-600 hover:text-purple-400 text-[10px] p-0.5" title="Remise ligne">%</button>
                  <button onClick={() => removeItem(item.id)} className="text-zinc-600 hover:text-red-400 text-sm p-0.5">✕</button>
                </div>
              ))
            )}
          </div>

          {/* Ticket discount */}
          {ticketDiscount && (
            <div className="px-3 py-2 border-t border-zinc-800 flex items-center justify-between bg-purple-500/5">
              <div>
                <p className="text-xs text-purple-400 font-medium">Remise: {ticketDiscount.reason}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-purple-400">-{formatPrice(ticketDiscount.amount)} €</span>
                <button onClick={() => setTicketDiscount(null)} className="text-purple-400/50 hover:text-red-400 text-xs">✕</button>
              </div>
            </div>
          )}

          {/* NumPad */}
          <div className="px-2 py-2 border-t border-zinc-800">
            <NumPad
              value={numpadValue}
              onChange={setNumpadValue}
              onQuantity={handleQuantity}
              onFreePrice={handleFreePrice}
              onDiscountPct={() => setShowDiscountModal('percent')}
              onDiscountEur={() => setShowDiscountModal('euro')}
            />
          </div>

          {/* Total + checkout */}
          <div className="px-3 py-3 border-t border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Total</span>
              <span className="text-xl font-extrabold text-brand-light">{formatPrice(total)} €</span>
            </div>
            <button onClick={() => setShowCheckout(true)} disabled={cart.length === 0}
              className="w-full py-3 rounded-xl bg-brand text-zinc-950 font-extrabold text-base active:scale-[0.97] disabled:opacity-30">
              Encaisser
            </button>
          </div>
        </div>
      </div>

      {/* ─── Modals ─── */}

      {/* Size popup */}
      {showSizePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSizePopup(null)}>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 w-80 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white text-center">{getItemName(showSizePopup.id, showSizePopup.name)}</h3>
            {showSizePopup.sizes?.map((size) => (
              <button key={size.sizeKey} onClick={() => { addToCart(showSizePopup, size.sizeKey); setShowSizePopup(null); }}
                className="w-full py-4 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-semibold text-base hover:border-brand/30 active:scale-95 flex items-center justify-between px-5">
                <span className="capitalize">{size.sizeKey}</span>
                <span className="text-brand-light font-bold">{formatPrice(size.price)} €</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <CheckoutModal
          total={total}
          itemCount={itemCount}
          onSubmit={handleSubmitOrder}
          onClose={() => { setShowCheckout(false); setOrderError(null); }}
          submitting={submitting}
          error={orderError}
        />
      )}

      {/* Discount modal */}
      {showDiscountModal && (
        <DiscountModal
          type={showDiscountModal}
          currentTotal={subtotal}
          onApply={(amount, reason) => setTicketDiscount({ amount, reason })}
          onClose={() => setShowDiscountModal(null)}
        />
      )}

      {/* Line discount modal */}
      {lineDiscountItemId && (() => {
        const item = cart.find((c) => c.id === lineDiscountItemId);
        if (!item) return null;
        return (
          <DiscountModal
            type="percent"
            currentTotal={item.price * item.quantity}
            onApply={(amount, reason) => applyLineDiscount(lineDiscountItemId, amount, reason)}
            onClose={() => setLineDiscountItemId(null)}
          />
        );
      })()}

      {/* Receipt */}
      {lastOrderData && <OrderReceipt order={lastOrderData} onClose={() => setLastOrderData(null)} />}

      {/* Ticket print sequence: kitchen → client (auto-triggered after checkout) */}
      {printTicket && printMode && (
        <TicketPrint
          order={printTicket}
          mode={printMode}
          onPrinted={() => {
            if (printMode === 'kitchen') {
              setPrintMode('client');
            } else {
              setPrintTicket(null);
              setPrintMode(null);
            }
          }}
        />
      )}

      {/* Builder */}
      {builderLoading && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center pointer-events-none">
          <div className="bg-zinc-900 rounded-xl px-6 py-4 text-white text-sm shadow-lg">Chargement...</div>
        </div>
      )}
      {builderLoadError && (
        <div className="fixed top-16 right-4 z-50 px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium shadow-lg">
          Erreur de chargement. Reessayez.
        </div>
      )}

      {/* Auth expiry prompt — doesn't clear cart */}
      {authExpired && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 rounded-2xl border border-brand/30 p-8 w-96 text-center space-y-4">
            <span className="text-5xl block">🔒</span>
            <h2 className="text-lg font-bold text-white">Session expirée</h2>
            <p className="text-sm text-zinc-400">Votre session a expiré. Reconnectez-vous pour continuer. Vos tickets sont préservés.</p>
            <button onClick={() => { window.location.href = '/login?redirect=/pos'; }}
              className="w-full py-4 rounded-xl bg-brand text-zinc-950 font-extrabold text-base">
              Se reconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Protected wrapper ───
function POSGate() {
  const enabled = useModule('pos');
  if (!enabled) return <FeatureDisabledPage module="POS" />;
  return <POSContent />;
}

export default function POSPage() {
  return (
    <ProtectedRoute allowedRoles={['patron', 'manager', 'employe', 'franchisor_admin', 'franchisee_owner', 'location_manager']}>
      <POSGate />
    </ProtectedRoute>
  );
}
