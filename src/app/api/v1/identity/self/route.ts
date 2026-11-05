import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/config/env';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Authorization' };
const denial = (status: number) =>
  NextResponse.json({ authorized: false }, { status, headers });

/**
 * The verified caller learns only the ID of their own active 7Service identity.
 * It never returns organizations, customer identities, roles or entitlements.
 * Product and tenant grants are checked independently by /authorization/decision.
 */
export async function GET(request: Request) {
  const bearer = request.headers.get('authorization') ?? '';
  if (!/^Bearer [A-Za-z0-9._~-]+$/i.test(bearer)) return denial(401);
  try {
    const env = getPublicEnv();
    const auth = createSupabaseClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: verified, error } = await auth.auth.getUser(bearer.slice(7));
    if (error || !verified.user) return denial(401);
    const db = createAdminClient();
    const result = await db
      .from('identities')
      .select('id,status')
      .eq('auth_user_id', verified.user.id)
      .maybeSingle();
    if (result.error) return denial(503);
    if (result.data?.status !== 'ACTIVE') return denial(403);
    return NextResponse.json(
      { authorized: true, identityId: result.data.id },
      { headers },
    );
  } catch {
    return denial(503);
  }
}
