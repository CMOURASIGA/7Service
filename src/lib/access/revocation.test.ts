import { describe, expect, it } from 'vitest';
import { canUseProductAccess, revokeAccess } from './revocation';

const active = {
  identityStatus: 'ACTIVE' as const,
  accessStatus: 'ACTIVE' as const,
  subscriptionStatus: 'ACTIVE' as const,
  clientStatus: 'ACTIVE' as const,
  at: '2026-10-29T12:00:00Z',
};

describe('product authorization', () => {
  it('permits active grants', () => expect(canUseProductAccess(active)).toBe(true));
  it('denies revoked grants even with active identity', () =>
    expect(canUseProductAccess({ ...active, accessStatus: 'REVOKED' })).toBe(false));
  it('denies suspended clients', () =>
    expect(canUseProductAccess({ ...active, clientStatus: 'SUSPENDED' })).toBe(false));
  it('denies suspended identities', () =>
    expect(canUseProductAccess({ ...active, identityStatus: 'SUSPENDED' })).toBe(false));
  it('denies cancelled subscriptions', () =>
    expect(canUseProductAccess({ ...active, subscriptionStatus: 'CANCELLED' })).toBe(false));
  it('denies access before the start of validity', () =>
    expect(canUseProductAccess({ ...active, validFrom: '2026-10-30T00:00:00Z' })).toBe(false));
  it('permits access starting at the validity boundary', () =>
    expect(canUseProductAccess({ ...active, validFrom: active.at })).toBe(true));
  it('denies access at the expiration boundary', () =>
    expect(canUseProductAccess({ ...active, validUntil: active.at })).toBe(false));
  it('rejects invalid timestamps instead of allowing access', () =>
    expect(() => canUseProductAccess({ ...active, at: 'invalid' })).toThrow());
  it('keeps revocation idempotent', () => {
    expect(revokeAccess('ACTIVE')).toBe('REVOKED');
    expect(revokeAccess('REVOKED')).toBe('REVOKED');
  });
});
