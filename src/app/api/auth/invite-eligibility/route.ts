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
  const identity = await createAdminClient()
    .from('identities')
    .select('id,status,email')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (identity.error || !identity.data ||
      identity.data.email.toLowerCase() !== user.email?.toLowerCase())
    return NextResponse.json({ eligible: false }, { status: 403, headers });

  // Legacy invitation trigger marked an identity ACTIVE immediately on
  // OTP verification, before the invited customer could create a password.
  // Only permit recovering this incomplete invitation if a reserved product
  // grant still exists and this account's invitation was recently accepted.
  let eligible = identity.data.status === 'PENDING_INVITE';
  if (!eligible && identity.data.status === 'ACTIVE') {
    const db = createAdminClient();
    const [grants, invitations] = await Promise.all([
      db.from('user_product_access').select('id')
        .eq('identity_id', identity.data.id).eq('status', 'PENDING').limit(1),
      db.from('invitations').select('id,accepted_at')
        .eq('identity_id', identity.data.id).eq('status', 'ACCEPTED')
        .order('accepted_at', { ascending: false }).limit(1),
    ]);
    const acceptedAt = invitations.data?.[0]?.accepted_at;
    const age = acceptedAt ? Date.now() - new Date(acceptedAt).getTime() : NaN;
    eligible = !grants.error && (grants.data?.length ?? 0) === 1 &&
      !invitations.error && Number.isFinite(age) && age >= 0 && age < 24 * 60 * 60 * 1000;
  }
  if (!eligible)
    return NextResponse.json({ eligible: false }, { status: 403, headers });
  return NextResponse.json(
    {
      eligible: true,
      email: identity.data.email,
    },
    { headers },
  );
}
