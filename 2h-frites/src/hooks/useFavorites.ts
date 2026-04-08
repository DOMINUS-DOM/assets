'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = '2h-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
    }
  }, [favorites, loaded]);

  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (itemId: string) => favorites.has(itemId),
    [favorites]
  );

  return { favorites, toggleFavorite, isFavorite, count: favorites.size };
}
