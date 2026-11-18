import { describe, expect, it } from 'vitest';
import { displayProductName } from './product-display-name';

describe('public Commander brand label without changing technical IDs', () => {
  it('converts legacy catalog name', () => {
    expect(displayProductName('7Commander')).toBe('Commander');
    expect(displayProductName('Commander')).toBe('Commander');
  });
  it('preserves other products and blank values', () => {
    expect(displayProductName('7Clinic')).toBe('7Clinic');
    expect(displayProductName(null)).toBe('');
  });
});
