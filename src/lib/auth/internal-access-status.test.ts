import { describe, expect, it } from 'vitest';

import { internalAccessHttpStatus } from './internal-access-status';

describe('internal access HTTP contract', () => {
  it('returns 401 for anonymous requests', () => {
    expect(internalAccessHttpStatus({ authenticated: false, authorized: false })).toBe(401);
  });
  it('returns 403 for authenticated QA without internal authorization', () => {
    expect(internalAccessHttpStatus({ authenticated: true, authorized: false })).toBe(403);
  });
  it('returns 200 only for authorized operators', () => {
    expect(internalAccessHttpStatus({ authenticated: true, authorized: true })).toBe(200);
  });
});
