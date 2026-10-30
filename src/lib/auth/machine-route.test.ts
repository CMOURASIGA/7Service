import { describe, expect, it } from 'vitest';

import { isMachineEntitlementRoute } from './machine-route';

describe('isMachineEntitlementRoute', () => {
  it('permits only M2M entitlement reads to reach token validation', () => {
    expect(
      isMachineEntitlementRoute('/api/integrations/7commander/entitlements/org-1', 'GET'),
    ).toBe(true);
    expect(
      isMachineEntitlementRoute('/api/integrations/7clinic/entitlements/clinic-1', 'GET'),
    ).toBe(true);
  });

  it('accepts only signed-product access decision URLs for POST', () => {
    expect(isMachineEntitlementRoute('/api/integrations/7commander/access/org-1', 'POST')).toBe(
      true,
    );
    expect(isMachineEntitlementRoute('/api/integrations/7clinic/access/clinic-1', 'POST')).toBe(
      true,
    );
    expect(isMachineEntitlementRoute('/api/integrations/7clinic/access/clinic-1', 'GET')).toBe(
      false,
    );
  });

  it('keeps private browser APIs and mutations protected', () => {
    expect(isMachineEntitlementRoute('/api/internal/contracts/1/documents', 'GET')).toBe(false);
    expect(
      isMachineEntitlementRoute('/api/integrations/7clinic/entitlements/clinic-1', 'POST'),
    ).toBe(false);
    expect(
      isMachineEntitlementRoute('/api/integrations/7clinic/entitlements/clinic-1/extra', 'GET'),
    ).toBe(false);
    expect(isMachineEntitlementRoute('/api/integrations/unknown/entitlements/org-1', 'GET')).toBe(
      false,
    );
  });
});
