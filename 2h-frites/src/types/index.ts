export type Locale = 'fr' | 'en' | 'es' | 'nl';

export type Tag = 'vegetarian' | 'spicy' | 'popular' | 'new';

export interface SizeVariant {
  sizeKey: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  descriptionKey?: string;
  price?: number;
  sizes?: SizeVariant[];
  currency: string;
  tags?: Tag[];
  allergens?: number[];
  subcategory?: string;
  priceLabel?: string;
  unavailable?: boolean;
  imageUrl?: string;
}

export interface Category {
  id: string;
  slug: string;
  nameKey: string;
  icon: string;
  imageUrl?: string;
  items: MenuItem[];
  note?: string;
  flatPrice?: { price: number; labelKey: string };
  subcategories?: string[];
  builder?: boolean;
}

export interface SearchResult {
  item: MenuItem;
  category: Category;
}

// ─── Menu Catalog v2 (relational) ───

export interface ModifierGroupData {
  id: string;
  name: string;
  nameKey?: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  sortOrder: number;
  modifiers: ModifierData[];
}

export interface ModifierData {
  id: string;
  name: string;
  nameKey?: string;
  price: number;
  active: boolean;
  sortOrder: number;
}

export interface BuilderStep {
  key: string;
  label: string;
  type?: 'options';       // 'options' = hardcoded choices, else groupId-based
  options?: string[];     // for type='options'
  groupId?: string;       // reference to ModifierGroup
  maxSelect?: number;
}

export interface BuilderConfigData {
  id: string;
  productId: string;
  basePrice: number;
  steps: BuilderStep[];
  options?: Record<string, any>;
}

export interface ProductModifierLink {
  id: string;
  groupId: string;
  sortOrder: number;
  group: ModifierGroupData;
}

export interface MenuProductFull {
  id: string;
  categoryId: string;
  name: string;
  nameKey?: string;
  descKey?: string;
  price?: number;
  active: boolean;
  sortOrder: number;
  tags: string[];
  allergens: number[];
  subcategory?: string;
  priceLabel?: string;
  imageUrl?: string;
  sizes: SizeVariant[];
  modifierLinks: ProductModifierLink[];
  builderConfig?: BuilderConfigData;
}

export interface MenuCategoryFull {
  id: string;
  slug: string;
  nameKey: string;
  icon: string;
  sortOrder: number;
  active: boolean;
  builder: boolean;
  note?: string;
  flatPrice?: number;
  items: MenuProductFull[];
}
