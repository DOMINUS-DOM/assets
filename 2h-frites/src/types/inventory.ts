export interface Ingredient {
  id: string;
  name: string;
  unit: string; // kg, L, pièces, sachets
  currentStock: number;
  minStock: number;
  costPerUnit: number;
  supplierId?: string;
  expiryDate?: string;
  category: 'frites' | 'viandes' | 'sauces' | 'pains' | 'boissons' | 'legumes' | 'autre';
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export interface StockMovement {
  id: string;
  ingredientId: string;
  type: 'in' | 'out' | 'waste' | 'adjustment';
  quantity: number;
  note: string;
  date: string;
}
