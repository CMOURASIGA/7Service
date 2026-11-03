import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  requirePermission: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock('@/lib/auth/session', () => ({
  requirePermission: mocks.requirePermission,
}));

import { GET } from './route';

describe('GET /api/auth/internal-access HTTP contract', () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.requirePermission.mockReset();
  });

  it('returns 401 JSON without a Supabase Auth session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ authorized: false });
    expect(mocks.requirePermission).not.toHaveBeenCalled();
  });

  it('returns 403 JSON for an authenticated customer without internal role', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'qa' } }, error: null });
    mocks.requirePermission.mockRejectedValue(new AppError('FORBIDDEN', 'Acesso negado'));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ authorized: false });
  });

  it('returns 200 JSON for an internal authorized operator', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'operator' } }, error: null });
    mocks.requirePermission.mockResolvedValue({});
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authorized: true });
    expect(mocks.requirePermission).toHaveBeenCalledWith('clients.view');
  });

  it('fails closed with 503 JSON for unexpected authorization errors', async () => {
    mocks.getUser.mockRejectedValue(new Error('service down'));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ error: 'Verificação administrativa indisponível' });
  });
});
