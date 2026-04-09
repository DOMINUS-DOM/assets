import { Ingredient, Supplier, StockMovement } from '@/types/inventory';

let counter = 800;
function genId(prefix: string) { return `${prefix}-${++counter}`; }

const DEMO_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', name: 'Claes Frites', phone: '+32 64 111 222', email: 'info@claesfrites.be', notes: 'Livraison mardi et vendredi' },
  { id: 'sup-2', name: 'Vandemoortele', phone: '+32 64 333 444', email: 'commandes@vdm.be', notes: 'Sauces et surgelés' },
  { id: 'sup-3', name: 'Drinks Center', phone: '+32 64 555 666', email: 'drinks@center.be', notes: '' },
];

const DEMO_INGREDIENTS: Ingredient[] = [
  { id: 'ing-1', name: 'Pommes de terre', unit: 'kg', currentStock: 120, minStock: 50, costPerUnit: 0.80, supplierId: 'sup-1', category: 'frites' },
  { id: 'ing-2', name: 'Huile de friture', unit: 'L', currentStock: 40, minStock: 20, costPerUnit: 2.10, supplierId: 'sup-1', category: 'frites' },
  { id: 'ing-3', name: 'Fricadelles', unit: 'pièces', currentStock: 80, minStock: 30, costPerUnit: 0.65, supplierId: 'sup-2', category: 'viandes' },
  { id: 'ing-4', name: 'Pains hamburger', unit: 'pièces', currentStock: 45, minStock: 20, costPerUnit: 0.25, supplierId: 'sup-2', category: 'pains' },
  { id: 'ing-5', name: 'Sauce samouraï (seau)', unit: 'L', currentStock: 8, minStock: 3, costPerUnit: 8.50, supplierId: 'sup-2', category: 'sauces' },
  { id: 'ing-6', name: 'Coca-Cola (canettes)', unit: 'pièces', currentStock: 120, minStock: 48, costPerUnit: 0.55, supplierId: 'sup-3', category: 'boissons' },
  { id: 'ing-7', name: 'Steak haché 100g', unit: 'pièces', currentStock: 15, minStock: 20, costPerUnit: 1.20, supplierId: 'sup-2', category: 'viandes', expiryDate: '2026-04-12' },
  { id: 'ing-8', name: 'Salade', unit: 'pièces', currentStock: 10, minStock: 5, costPerUnit: 0.90, supplierId: 'sup-2', category: 'legumes', expiryDate: '2026-04-11' },
];

const DEMO_MOVEMENTS: StockMovement[] = [
  { id: 'mv-1', ingredientId: 'ing-1', type: 'in', quantity: 200, note: 'Livraison Claes', date: '2026-04-08' },
  { id: 'mv-2', ingredientId: 'ing-1', type: 'out', quantity: 80, note: 'Usage quotidien', date: '2026-04-09' },
  { id: 'mv-3', ingredientId: 'ing-7', type: 'waste', quantity: 5, note: 'Périmé', date: '2026-04-09' },
];

let ingredients: Ingredient[] = [...DEMO_INGREDIENTS];
let suppliers: Supplier[] = [...DEMO_SUPPLIERS];
let movements: StockMovement[] = [...DEMO_MOVEMENTS];
let listeners: (() => void)[] = [];
function notify() { listeners.forEach((l) => l()); }

export const inventoryStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },

  // Ingredients
  getIngredients: () => ingredients,
  getLowStock: () => ingredients.filter((i) => i.currentStock <= i.minStock),
  getExpiringSoon: () => {
    const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    return ingredients.filter((i) => i.expiryDate && i.expiryDate <= in3Days);
  },

  addIngredient(data: Omit<Ingredient, 'id'>): Ingredient {
    const ing: Ingredient = { ...data, id: genId('ing') };
    ingredients = [...ingredients, ing];
    notify();
    return ing;
  },

  updateIngredient(id: string, data: Partial<Ingredient>) {
    ingredients = ingredients.map((i) => (i.id === id ? { ...i, ...data } : i));
    notify();
  },

  // Stock movements
  getMovements: (ingredientId?: string) => ingredientId ? movements.filter((m) => m.ingredientId === ingredientId) : movements,

  addMovement(data: Omit<StockMovement, 'id'>): StockMovement {
    const mv: StockMovement = { ...data, id: genId('mv') };
    movements = [mv, ...movements];
    // Update stock
    const delta = data.type === 'in' ? data.quantity : -data.quantity;
    ingredients = ingredients.map((i) =>
      i.id === data.ingredientId ? { ...i, currentStock: Math.max(0, i.currentStock + delta) } : i
    );
    notify();
    return mv;
  },

  // Suppliers
  getSuppliers: () => suppliers,
  addSupplier(data: Omit<Supplier, 'id'>): Supplier {
    const sup: Supplier = { ...data, id: genId('sup') };
    suppliers = [...suppliers, sup];
    notify();
    return sup;
  },
};
