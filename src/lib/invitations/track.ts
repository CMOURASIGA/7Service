import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Administrative delivery receipt. Authentication and activation are managed
 * exclusively by Supabase Auth; this random correlation hash is NEVER a
 * login token and cannot be exchanged for access.
 */
export async function trackAuthInvitation(input: { identityId: string; operatorId: string }) {
  const db = createAdminClient();
  const randomCorrelation = randomBytes(32);
  const tokenHash = createHash('sha256').update(randomCorrelation).digest('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data, error } = await db
    .from('invitations')
    .insert({
      identity_id: input.identityId,
      created_by: input.operatorId,
      status: 'SENT',
      token_hash: tokenHash,
      sent_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single();
  if (error || !data) throw new Error('Auth invite issued, but tracking record failed.');
  return data.id;
}
