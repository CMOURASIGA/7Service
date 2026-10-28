import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/config/env';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Authorization' };
export async function GET(request: Request) {
  const bearer = request.headers.get('authorization') ?? '';
  if (!/^Bearer [A-Za-z0-9._~-]+$/i.test(bearer))
    return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401, headers });
  try {
    const env = getPublicEnv();
    const auth = createSupabaseClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: verified, error: authError } = await auth.auth.getUser(bearer.slice(7));
    if (authError || !verified.user)
      return NextResponse.json({ error: 'INVALID_AUTH' }, { status: 401, headers });
    const db = createAdminClient();
    const { data: identity, error: identityError } = await db
      .from('identities')
      .select('id,status')
      .eq('auth_user_id', verified.user.id)
      .maybeSingle();
    if (identityError)
      return NextResponse.json({ error: 'BACKEND_ERROR' }, { status: 503, headers });
    if (identity?.status !== 'ACTIVE') return NextResponse.json({ memberships: [] }, { headers });
    const { data: memberships, error } = await db
      .from('client_memberships')
      .select('client_id,status,clients(id,legal_name,trade_name,status)')
      .eq('identity_id', identity.id)
      .eq('status', 'ACTIVE');
    if (error) return NextResponse.json({ error: 'BACKEND_ERROR' }, { status: 503, headers });
    return NextResponse.json(
      {
        version: '1',
        memberships: (memberships ?? [])
          .filter((m) => m.clients?.status === 'ACTIVE')
          .map((m) => ({
            clientId: m.client_id,
            name: m.clients?.trade_name || m.clients?.legal_name,
          })),
      },
      { headers },
    );
  } catch {
    return NextResponse.json({ error: 'BACKEND_ERROR' }, { status: 503, headers });
  }
}
