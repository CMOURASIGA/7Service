import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Invitation acceptance is always bound to the authenticated Auth UID
 * and an identity which is actually awaiting invitation.
 * Existing active accounts may not reuse their browser session to accept
 * another person's invitation and overwrite their own password.
 */
export async function GET() {
  const auth = await createClient();
  const result = await auth.auth.getUser();
  const user = result.data.user;
  const headers = { 'Cache-Control': 'private, no-store, max-age=0' };
  if (result.error || !user || !user.email_confirmed_at)
    return NextResponse.json({ eligible: false }, { status: 403, headers });
  const identity = await createAdminClient().from('identities')
    .select('id,status,email').eq('auth_user_id', user.id).maybeSingle();
  if (identity.error || identity.data?.status !== 'PENDING_INVITE' ||
      identity.data.email.toLowerCase() !== user.email?.toLowerCase())
    return NextResponse.json({ eligible: false }, { status: 403, headers });
  return NextResponse.json({
    eligible: true, email: identity.data.email,
  }, { headers });
}
