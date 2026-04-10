import { Category, MenuItem } from '@/types';
import { categories as staticCategories } from '@/data/menu';

let counter = 500;
function genId(prefix: string) { return `${prefix}-${Date.now()}-${++counter}`; }

// Start with static data, then load from API
let categories: Category[] = JSON.parse(JSON.stringify(staticCategories));
let loaded = false;
let listeners: (() => void)[] = [];
function notify() { listeners.forEach((l) => l()); }

// Persist to API (fire-and-forget, debounced)
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persistToApi() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categories),
    }).catch(() => {});
  }, 300);
}

// Load from API on first access
function loadFromApi() {
  if (loaded) return;
  loaded = true;
  fetch('/api/menu')
    .then((r) => r.json())
    .then((data: Category[]) => {
      if (Array.isArray(data) && data.length > 0) {
        categories = data;
        notify();
      }
    })
    .catch(() => {});
}

export const menuStore = {
  subscribe(listener: () => void) {
    loadFromApi();
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
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
