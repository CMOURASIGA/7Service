import { describe, expect, it } from 'vitest';

import { safeAdminRedirect } from './safe-admin-redirect';

describe('safeAdminRedirect', () => {
  it('preserves local admin destinations', () => {
    expect(safeAdminRedirect('/clientes')).toBe('/clientes');
    expect(safeAdminRedirect(null)).toBe('/');
  });

  it('rejects external or ambiguous destinations', () => {
    expect(safeAdminRedirect('https://evil.test/')).toBe('/');
    expect(safeAdminRedirect('//evil.test')).toBe('/');
    expect(safeAdminRedirect('/\\evil.test')).toBe('/');
    expect(safeAdminRedirect('/clientes\nLocation:evil')).toBe('/');
  });
});
