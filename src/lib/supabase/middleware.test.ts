import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock('@/config/env', () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.test',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'qa-anon-key',
  }),
}));

import { updateSession } from './middleware';

describe('authentication middleware HTTP contract', () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
  });

  it('passes anonymous internal-access requests to the API for a 401 JSON', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(
      new NextRequest('https://7service.example.test/api/auth/internal-access'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });

  it('passes authenticated customer internal-access requests to the API for a 403 JSON', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'qa' } } });
    const response = await updateSession(
      new NextRequest('https://7service.example.test/api/auth/internal-access'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('passes authenticated users to the dedicated restricted page', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'qa' } } });
    const response = await updateSession(
      new NextRequest('https://7service.example.test/acesso-restrito'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('keeps other unauthenticated administrative endpoints protected', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(
      new NextRequest('https://7service.example.test/api/internal/clients'),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Sessão necessária' });
  });

  it('redirects unauthenticated private pages to login', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(new NextRequest('https://7service.example.test/clientes'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });
});
