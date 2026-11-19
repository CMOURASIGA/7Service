import { describe, expect, it } from 'vitest';
import {
  provisioningIdempotencyKey,
  validateProvisioningIntent,
  type ProvisioningIntent,
} from './provisioning-intent';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sample: ProvisioningIntent = {
  requestId: id(1),
  operation: 'INVITE',
  centralIdentityId: id(2),
  contractId: id(3),
  companyId: id(4),
  productId: id(5),
  deploymentId: id(6),
  environmentId: id(7),
  email: 'maria@example.com',
  localAuthUserId: null,
};
describe('secure provisioning intent', () => {
  it('validates an invitation to an existing deployment', () => {
    expect(validateProvisioningIntent(sample)).toBe(sample);
  });
  it('refuses an existing local Auth UID during invite', () => {
    expect(() => validateProvisioningIntent({ ...sample, localAuthUserId: id(8) })).toThrow(
      'REMOTE_ACCOUNT_ALREADY_LINKED',
    );
  });
  it('requires an immutable local Auth ID for account operations', () => {
    for (const operation of ['VERIFY', 'RECOVER', 'REVOKE_ACCESS'] as const) {
      expect(() => validateProvisioningIntent({ ...sample, operation })).toThrow(
        'REMOTE_AUTH_ID_REQUIRED',
      );
    }
  });
  it('rejects malformed IDs and email addresses', () => {
    expect(() => validateProvisioningIntent({ ...sample, companyId: 'other' })).toThrow(
      'INVALID_PROVISIONING_ID',
    );
    expect(() => validateProvisioningIntent({ ...sample, email: 'maria@EXAMPLE.com' })).toThrow(
      'INVALID_PROVISIONING_EMAIL',
    );
  });
  it('uses request, installation, environment and action as idempotency dimensions', () => {
    expect(provisioningIdempotencyKey(sample)).toContain(sample.environmentId);
    expect(provisioningIdempotencyKey({ ...sample, requestId: id(9) })).not.toEqual(
      provisioningIdempotencyKey(sample),
    );
  });
});
