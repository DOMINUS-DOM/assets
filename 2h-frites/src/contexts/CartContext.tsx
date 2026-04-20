'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { CartItem } from '@/types/order';

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (menuItemId: string, sizeKey?: string, extras?: { name: string; price: number }[]) => void;
  updateQuantity: (menuItemId: string, quantity: number, sizeKey?: string, extras?: { name: string; price: number }[]) => void;
  clearCart: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = '2h-cart';

function getKey(item: { menuItemId: string; sizeKey?: string; extras?: { name: string; price: number }[] }) {
  const base = item.sizeKey ? `${item.menuItemId}__${item.sizeKey}` : item.menuItemId;
  // Include extras in key so "Frites M Sel" and "Frites M Epice" are separate items
  if (item.extras?.length) {
    return `${base}__${item.extras.map((e) => e.name).join('_')}`;
  }
  return base;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
    }
  }, [items, loaded]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const key = getKey(item);
      const existing = prev.find((i) => getKey(i) === key);
      if (existing) {
        return prev.map((i) => getKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((menuItemId: string, sizeKey?: string, extras?: { name: string; price: number }[]) => {
    const key = getKey({ menuItemId, sizeKey, extras });
    setItems((prev) => prev.filter((i) => getKey(i) !== key));
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number, sizeKey?: string, extras?: { name: string; price: number }[]) => {
    const key = getKey({ menuItemId, sizeKey, extras });
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => getKey(i) !== key));
    } else {
      setItems((prev) => prev.map((i) => getKey(i) === key ? { ...i, quantity } : i));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
