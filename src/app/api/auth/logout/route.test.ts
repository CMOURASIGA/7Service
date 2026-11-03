import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ signOut: vi.fn(), getCurrentSession: vi.fn(), audit: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { signOut: mocks.signOut } }),
}));

vi.mock('@/lib/auth/session', () => ({ getCurrentSession: mocks.getCurrentSession }));
vi.mock('@/lib/audit/record-admin-event', () => ({ recordAdminEvent: mocks.audit }));

import { POST } from './route';

describe('POST /api/auth/logout HTTP contract', () => {
  beforeEach(() => {
    mocks.signOut.mockReset();
    mocks.getCurrentSession.mockReset();
    mocks.getCurrentSession.mockResolvedValue(null);
    mocks.audit.mockReset();
  });

  it('rejects cross-origin logout before accessing Auth', async () => {
    const request = new NextRequest('https://app.example.test/api/auth/logout', {
      method: 'POST',
      headers: { origin: 'https://other.example.test' },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('signs out the Supabase session and returns JSON with no-store', async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    const request = new NextRequest('https://app.example.test/api/auth/logout', {
      method: 'POST',
      headers: { origin: 'https://app.example.test' },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ signedOut: true });
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it('returns 503 without reporting success when Auth signout fails', async () => {
    mocks.signOut.mockResolvedValue({ error: { message: 'failure' } });
    const request = new NextRequest('https://app.example.test/api/auth/logout', {
      method: 'POST',
      headers: { origin: 'https://app.example.test' },
    });
    const response = await POST(request);
    expect(response.status).toBe(503);
  });
});
