/**
 * Validates a 7Service-approved, destination-specific provisioning instruction.
 * This is a validation boundary, not an authorization grant. The server must
 * authorize actor, contract, product and company before constructing an intent.
 */
export type ProvisioningKind = 'INVITE' | 'VERIFY' | 'RECOVER' | 'REVOKE_ACCESS';
export interface ProvisioningIntent {
  requestId: string;
  operation: ProvisioningKind;
  centralIdentityId: string;
  contractId: string;
  companyId: string;
  productId: string;
  deploymentId: string;
  environmentId: string;
  email: string;
  localAuthUserId: string | null;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateProvisioningIntent(input: ProvisioningIntent): ProvisioningIntent {
  for (const key of ['requestId', 'centralIdentityId', 'contractId', 'companyId',
    'productId', 'deploymentId', 'environmentId'] as const) {
    if (!uuid.test(input[key])) throw new Error('INVALID_PROVISIONING_ID');
  }
  if (!email.test(input.email) || input.email !== input.email.toLowerCase() ||
      input.email.length > 254) throw new Error('INVALID_PROVISIONING_EMAIL');
  if (input.localAuthUserId && !uuid.test(input.localAuthUserId))
    throw new Error('INVALID_REMOTE_AUTH_ID');
  if (input.operation === 'VERIFY' && !input.localAuthUserId)
    throw new Error('REMOTE_AUTH_ID_REQUIRED');
  if (input.operation === 'REVOKE_ACCESS' && !input.localAuthUserId)
    throw new Error('REMOTE_AUTH_ID_REQUIRED');
  if (input.operation === 'RECOVER' && !input.localAuthUserId)
    throw new Error('REMOTE_AUTH_ID_REQUIRED');
  if (input.operation === 'INVITE' && input.localAuthUserId)
    throw new Error('REMOTE_ACCOUNT_ALREADY_LINKED');
  return input;
}

export function provisioningIdempotencyKey(intent: ProvisioningIntent): string {
  validateProvisioningIntent(intent);
  return [intent.requestId, intent.deploymentId, intent.environmentId, intent.operation].join(':');
}
