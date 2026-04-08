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
}

export interface Category {
  id: string;
  slug: string;
  nameKey: string;
  icon: string;
  items: MenuItem[];
  note?: string;
  flatPrice?: { price: number; labelKey: string };
  subcategories?: string[];
}

export interface SearchResult {
  item: MenuItem;
  category: Category;
}
