/**
 * Controlled one-off cleanup for the Cristiano Caldas QA onboarding.
 *
 * Run only from an authorized server environment with service-role keys.
 * Never commit secrets or execute this script from a browser.
 *
 * Required env: SERVICE_URL, SERVICE_ROLE_KEY,
 * COMMANDER_URL, COMMANDER_ROLE_KEY.
 *
 * Dry run:
 *   npx tsx scripts/reset-cristiano-onboarding.ts
 * Apply (irreversible):
 *   npx tsx scripts/reset-cristiano-onboarding.ts --execute
 *
 * Only the identity, memberships, grants and Auth account are purged.
 * Immutable audit history and the 7 CONSULTING contract remain untouched.
 */
import { createClient } from '@supabase/supabase-js';

const email = 'cristiano.caldas@7consulting.com.br';
const centralId = '249657a6-d891-4e87-93a5-0dff59fa2bee';
const clientId = 'ac0f9c40-7055-4a26-85c5-88d3e9428813';
const execute = process.argv.includes('--execute');

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Missing server-only variable: ' + name);
  return value;
}
const service = createClient(required('SERVICE_URL'), required('SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
});
const commander = createClient(required('COMMANDER_URL'), required('COMMANDER_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const identity = await service
    .from('identities')
    .select('id,email,status,auth_user_id')
    .eq('id', centralId)
    .single();
  if (identity.error || identity.data.email.toLowerCase() !== email)
    throw new Error('Target identity mismatch, aborting');

  const [memberships, grants, invitations, localLinks, localAccounts] = await Promise.all([
    service.from('client_memberships').select('id,client_id').eq('identity_id', centralId),
    service.from('user_product_access').select('id,client_id').eq('identity_id', centralId),
    service.from('invitations').select('id').eq('identity_id', centralId),
    commander.from('central_identity_user_links').select('id').eq('central_identity_id', centralId),
    commander
      .from('organization_members')
      .select('user_id,organization_id')
      .eq('organization_id', 'bce0fe84-eb14-4e9d-9815-1cb22cde3e5a'),
  ]);
  if ([memberships, grants, invitations, localLinks, localAccounts].some((v) => v.error))
    throw new Error('Cannot verify every identity dependency');
  if (
    (memberships.data ?? []).some((v) => v.client_id !== clientId) ||
    (grants.data ?? []).some((v) => v.client_id !== clientId) ||
    (localLinks.data ?? []).length
  )
    throw new Error('Identity is linked outside the expected company or already provisioned');
  if (!identity.data.auth_user_id)
    throw new Error('Auth account missing, manual reconciliation required');

  const localAuth = await commander.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (localAuth.error) throw new Error('Cannot validate destination Auth accounts');
  if (localAuth.data.users.some((user) => user.email?.toLowerCase() === email))
    throw new Error('Destination Auth account exists, cleanup requires separate workflow');

  const summary = {
    email,
    memberships: memberships.data?.length ?? 0,
    grants: grants.data?.length ?? 0,
    invitations: invitations.data?.length ?? 0,
    remoteIdentityLinks: localLinks.data?.length ?? 0,
    action: execute ? 'DELETE' : 'DRY_RUN',
  };
  process.stdout.write(JSON.stringify(summary) + '\n');
  if (!execute) return;

  // Auth Admin API must own deletion of auth.users, sessions and tokens.
  // Never delete auth.users through SQL or Supabase table REST.
  const deleted = await service.auth.admin.deleteUser(identity.data.auth_user_id);
  if (deleted.error) throw new Error('AUTH_DELETE_FAILED');

  const removeGrants = await service
    .from('user_product_access')
    .delete()
    .eq('identity_id', centralId);
  if (removeGrants.error) throw new Error('GRANT_PURGE_FAILED_AFTER_AUTH_DELETE');

  const removeMemberships = await service
    .from('client_memberships')
    .delete()
    .eq('identity_id', centralId);
  if (removeMemberships.error) throw new Error('MEMBERSHIP_PURGE_FAILED_AFTER_AUTH_DELETE');

  // Invitations cascade from the identity; the audit history is retained.
  const removeIdentity = await service
    .from('identities')
    .delete()
    .eq('id', centralId)
    .eq('email', email);
  if (removeIdentity.error) throw new Error('IDENTITY_PURGE_FAILED_AFTER_AUTH_DELETE');

  const check = await service.from('identities').select('id').eq('id', centralId);
  if (check.error || check.data?.length) throw new Error('PURGE_NOT_VERIFIED');
  process.stdout.write('IDENTITY_RESET_CONFIRMED\n');
}

main().catch((error: unknown) => {
  process.stderr.write(error instanceof Error ? error.message : 'RESET_ERROR');
  process.exitCode = 1;
});
