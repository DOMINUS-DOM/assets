import { Category, MenuItem } from '@/types';
import { categories as staticCategories } from '@/data/menu';

let counter = 500;
function genId(prefix: string) { return `${prefix}-${++counter}`; }

// Deep clone static data to make it mutable
let categories: Category[] = JSON.parse(JSON.stringify(staticCategories));
let listeners: (() => void)[] = [];
function notify() { listeners.forEach((l) => l()); }

export const menuStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },

  // ─── Categories ───
  getCategories: () => categories,
  getCategory: (id: string) => categories.find((c) => c.id === id),

  addCategory(data: { name: string; slug: string; icon: string; nameKey: string }): Category {
    const cat: Category = { id: genId('cat'), slug: data.slug, nameKey: data.nameKey, icon: data.icon, items: [] };
    categories = [...categories, cat];
    notify();
    return cat;
  },

  updateCategory(id: string, data: Partial<Pick<Category, 'icon' | 'slug' | 'nameKey'>>) {
    categories = categories.map((c) => (c.id === id ? { ...c, ...data } : c));
    notify();
  },

  deleteCategory(id: string) {
    categories = categories.filter((c) => c.id !== id);
    notify();
  },

  reorderCategories(orderedIds: string[]) {
    const map = new Map(categories.map((c) => [c.id, c]));
    categories = orderedIds.map((id) => map.get(id)!).filter(Boolean);
    notify();
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
    return newItem;
  },

  updateItem(categoryId: string, itemId: string, data: Partial<MenuItem>) {
    categories = categories.map((c) =>
      c.id === categoryId
        ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...data } : i)) }
        : c
    );
    notify();
  },

  deleteItem(categoryId: string, itemId: string) {
    categories = categories.map((c) =>
      c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
    );
    notify();
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
  },
};
