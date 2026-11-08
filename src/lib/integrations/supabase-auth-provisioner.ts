import 'server-only';
import { destinationAdminClient, type SealedCredential } from './supabase-connector';
import { validateProvisioningIntent, type ProvisioningIntent } from './provisioning-intent';

/**
 * Auth-only adapter. Company/role grants must be applied separately through
 * a product-specific authenticated endpoint and reconciled before marking a
 * provisioning operation successful. Do not call from unauthenticated routes.
 */
export async function executeAuthProvisioning(
  projectUrl: string,
  sealedKey: SealedCredential,
  intent: ProvisioningIntent,
): Promise<{ status: 'INVITED' | 'VERIFIED' | 'RECOVERY_REQUESTED'; localAuthUserId: string }> {
  validateProvisioningIntent(intent);
  if (intent.operation === 'REVOKE_ACCESS')
    throw new Error('REVOKE_REQUIRES_PRODUCT_AUTHORIZATION_ADAPTER');
  const client = destinationAdminClient(projectUrl, sealedKey);

  if (intent.operation === 'INVITE') {
    const { data, error } = await client.auth.admin.inviteUserByEmail(intent.email);
    if (error || !data.user) throw new Error('DESTINATION_AUTH_INVITE_FAILED');
    return { status: 'INVITED', localAuthUserId: data.user.id };
  }

  const remoteId = intent.localAuthUserId!;
  const { data, error } = await client.auth.admin.getUserById(remoteId);
  if (error || !data.user || data.user.email?.toLowerCase() !== intent.email)
    throw new Error('DESTINATION_AUTH_IDENTITY_MISMATCH');
  if (intent.operation === 'VERIFY')
    return { status: 'VERIFIED', localAuthUserId: remoteId };

  // This sends a message through the destination project's Auth service.
  // A successful API call is not proof of inbox delivery.
  const { error: resetError } = await client.auth.resetPasswordForEmail(intent.email);
  if (resetError) throw new Error('DESTINATION_AUTH_RECOVERY_FAILED');
  return { status: 'RECOVERY_REQUESTED', localAuthUserId: remoteId };
}
