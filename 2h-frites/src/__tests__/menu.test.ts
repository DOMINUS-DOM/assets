import { categories } from '@/data/menu';

describe('menu data', () => {
  it('has 11 categories', () => {
    expect(categories.length).toBe(11);
  });

  it('each category has required fields', () => {
    for (const cat of categories) {
      expect(cat.id).toBeTruthy();
      expect(cat.slug).toBeTruthy();
      expect(cat.nameKey).toBeTruthy();
      expect(cat.icon).toBeTruthy();
      expect(Array.isArray(cat.items)).toBe(true);
    }
  });

  it('frites has size variants', () => {
    const frites = categories.find((c) => c.id === 'frites');
    expect(frites).toBeTruthy();
    const fritesItem = frites!.items.find((i) => i.sizes);
    expect(fritesItem).toBeTruthy();
    expect(fritesItem!.sizes!.length).toBe(3);
  });

  it('sauces have flat price', () => {
    const sauces = categories.find((c) => c.id === 'sauces');
    expect(sauces?.flatPrice?.price).toBe(0.90);
  });

  it('all items with price have valid currency', () => {
    for (const cat of categories) {
      for (const item of cat.items) {
        expect(item.currency).toBe('€');
        if (item.price !== undefined) {
          expect(typeof item.price).toBe('number');
          expect(item.price).toBeGreaterThan(0);
        }
      }
    }
  });

  it('salads have prices', () => {
    const salades = categories.find((c) => c.id === 'salades');
    expect(salades).toBeTruthy();
    for (const item of salades!.items) {
      expect(item.price).toBeDefined();
      expect(item.price).toBeGreaterThan(0);
    }
  });
});
