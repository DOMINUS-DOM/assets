import { categories } from '@/data/menu';

describe('menu data integrity', () => {
  it('has 12 categories', () => {
    expect(categories.length).toBe(12);
  });

  it('pain-frites has builder flag', () => {
    const pf = categories.find((c) => c.id === 'pain_frites');
    expect(pf).toBeTruthy();
    expect(pf!.builder).toBe(true);
    expect(pf!.items.length).toBe(0); // builder = empty items, composed dynamically
  });

  it('magic-box has items', () => {
    const mb = categories.find((c) => c.slug === 'magic-box');
    expect(mb).toBeTruthy();
    expect(mb!.items.length).toBeGreaterThan(0);
  });

  it('sauces have flatPrice', () => {
    const sauces = categories.find((c) => c.id === 'sauces');
    expect(sauces?.flatPrice?.price).toBe(0.90);
  });

  it('all items have currency €', () => {
    for (const cat of categories) {
      for (const item of cat.items) {
        expect(item.currency).toBe('€');
      }
    }
  });

  it('viandes category exists for builders', () => {
    const viandes = categories.find((c) => c.id === 'viandes');
    expect(viandes).toBeTruthy();
    expect(viandes!.items.length).toBeGreaterThan(0);
  });

  it('supplements category exists for builders', () => {
    const supplements = categories.find((c) => c.id === 'supplements');
    expect(supplements).toBeTruthy();
    expect(supplements!.items.length).toBeGreaterThan(0);
  });

  it('frites have size variants', () => {
    const frites = categories.find((c) => c.id === 'frites');
    expect(frites).toBeTruthy();
    const sized = frites!.items.find((i) => i.sizes);
    expect(sized).toBeTruthy();
    expect(sized!.sizes!.length).toBe(3);
  });

  it('all categories have required fields', () => {
    for (const cat of categories) {
      expect(cat.id).toBeTruthy();
      expect(cat.slug).toBeTruthy();
      expect(cat.nameKey).toBeTruthy();
      expect(cat.icon).toBeTruthy();
      expect(Array.isArray(cat.items)).toBe(true);
    }
  });

  it('no duplicate category ids', () => {
    const ids = categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no duplicate item ids within categories', () => {
    for (const cat of categories) {
      const ids = cat.items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
