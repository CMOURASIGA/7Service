import { describe, expect, it } from 'vitest';
import { isIsoCalendarDate } from './iso-date';

describe('contract and subscription calendar dates', () => {
  it('accepts valid ISO dates including leap day', () => {
    expect(isIsoCalendarDate('2026-10-28')).toBe(true);
    expect(isIsoCalendarDate('2028-02-29')).toBe(true);
  });
  it('rejects impossible or malformed dates', () => {
    for (const value of ['2026-02-29', '2026-13-01', '2026-04-31', '2026-1-01', 'abc']) {
      expect(isIsoCalendarDate(value)).toBe(false);
    }
  });
});
