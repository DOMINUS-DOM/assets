import { Category, MenuItem } from '@/types';

let counter = 500;
function genId(prefix: string) { return `${prefix}-${Date.now()}-${++counter}`; }

// Always start empty. The static 2H Frites menu was leaking to every new tenant
// when their API returned []. Any caller must wait for loadFromApi() to populate.
let categories: Category[] = [];
let loaded = false;
let listeners: (() => void)[] = [];
function notify() { listeners.forEach((l) => l()); }

// Location-aware menu loading
let currentLocationId: string | null = null;

// Persist to API (fire-and-forget, debounced)
// Still saves to v1 for backward compatibility; admin v2 uses direct API calls
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persistToApi() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const locParam = currentLocationId ? `?locationId=${currentLocationId}` : '';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('2h-auth-token') : null;
    fetch(`/api/menu${locParam}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(categories),
    }).catch(() => {});
  }, 300);
}

// Load from API on first access — uses v2 (relational) with v1 fallback
let loadingPromise: Promise<void> | null = null;

function loadFromApi(locationId?: string | null) {
  // Normalize undefined → null so `getCategories()` (no arg) matches `setLocationId(null)`.
  // Without this, every render that calls getCategories triggered a fresh fetch and
  // notify() loop, freezing the tab.
  const normalized = locationId ?? null;
  if (loaded && normalized === currentLocationId) return;
  loaded = true;
  currentLocationId = normalized;
  const locParam = normalized ? `?locationId=${normalized}` : '';

  // Prevent duplicate fetches
  if (loadingPromise) return;

  loadingPromise = fetch(`/api/menu/v2${locParam}`)
    .then((r) => {
      if (!r.ok) throw new Error('v2 failed');
      return r.json();
    })
    .then((data: Category[]) => {
      // Always accept the tenant-scoped response, even when empty. An empty array
      // is the correct state for a new restaurant — never fall back to a static menu.
      categories = Array.isArray(data) ? data : [];
      notify();
    })
    .catch((err) => { console.warn('menuStore: failed to load from /api/menu/v2', err); })
    .finally(() => { loadingPromise = null; });
}

export const menuStore = {
  subscribe(listener: () => void) {
    loadFromApi();
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },

  // ─── Location ───
  setLocationId(locationId: string | null) {
    if (locationId !== currentLocationId) {
      loaded = false;
      loadFromApi(locationId);
    }
  },

  // ─── Categories ───
  getCategories: () => { loadFromApi(); return categories; },
  getCategory: (id: string) => categories.find((c) => c.id === id),

  addCategory(data: { name: string; slug: string; icon: string; nameKey: string }): Category {
    const cat: Category = { id: genId('cat'), slug: data.slug, nameKey: data.nameKey, icon: data.icon, items: [] };
    categories = [...categories, cat];
    notify();
    persistToApi();
    return cat;
  },

  updateCategory(id: string, data: Partial<Pick<Category, 'icon' | 'slug' | 'nameKey'>>) {
    categories = categories.map((c) => (c.id === id ? { ...c, ...data } : c));
    notify();
    persistToApi();
  },

  deleteCategory(id: string) {
    categories = categories.filter((c) => c.id !== id);
    notify();
    persistToApi();
  },

  reorderCategories(orderedIds: string[]) {
    const map = new Map(categories.map((c) => [c.id, c]));
    categories = orderedIds.map((id) => map.get(id)!).filter(Boolean);
    notify();
    persistToApi();
  },

  // ─── Items ───
  getItem(categoryId: string, itemId: string): MenuItem | undefined {
    return categories.find((c) => c.id === categoryId)?.items.find((i) => i.id === itemId);
  },

  addItem(categoryId: string, item: Omit<MenuItem, 'id'>): MenuItem {
    const newItem: MenuItem = { ...item, id: genId('item') };
    categories = categories.map((c) =>
      c.id === categoryId ? { ...c, items: [...c.items, newItem] } : c
    );
    notify();
    persistToApi();
    return newItem;
  },

  updateItem(categoryId: string, itemId: string, data: Partial<MenuItem>) {
    categories = categories.map((c) =>
      c.id === categoryId
        ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...data } : i)) }
        : c
    );
    notify();
    persistToApi();
  },

  deleteItem(categoryId: string, itemId: string) {
    categories = categories.map((c) =>
      c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
    );
    notify();
    persistToApi();
  },

  toggleItemAvailability(categoryId: string, itemId: string) {
    categories = categories.map((c) =>
      c.id === categoryId
        ? {
            ...c,
            items: c.items.map((i) =>
              i.id === itemId ? { ...i, unavailable: !i.unavailable } : i
            ),
          }
        : c
    );
    notify();
    persistToApi();
  },
};
