import { formatPrice } from '@/utils/format';

describe('formatPrice', () => {
  it('formats integer price', () => {
    expect(formatPrice(10)).toBe('10,00');
  });

  it('formats decimal price', () => {
    expect(formatPrice(3.80)).toBe('3,80');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('0,00');
  });

  it('formats large price', () => {
    expect(formatPrice(15.40)).toBe('15,40');
  });

  it('rounds to 2 decimals', () => {
    expect(formatPrice(3.999)).toBe('4,00');
  });
});
