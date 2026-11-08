import { describe, expect, it } from 'vitest';
import { canReleaseContractSeat, reconcileRemoteRevocation } from './provisioning-reconciliation';
import type {
  ProductProvisioningRequest, ProductProvisioningReceipt,
} from './product-provisioning-contract';

const request: ProductProvisioningRequest = {
  requestId: 'revocation-1', centralIdentityId: 'central-1',
  remoteAuthUserId: 'remote-1', companyId: 'company-1',
  remoteCompanyId: 'remote-company-1', productCode: 'COMMANDER7',
  roleCode: 'ADMIN', action: 'REVOKE',
};
const receipt: ProductProvisioningReceipt = {
  requestId: request.requestId, remoteAuthUserId: request.remoteAuthUserId,
  remoteCompanyId: request.remoteCompanyId, productCode: request.productCode,
  roleCode: null, effective: false, revision: 'revision-2026-11-08',
};
const empty = {
  pendingLegacyGrants: 0, activeLegacyGrants: 0, suspendedLegacyGrants: 0,
  pendingAssignments: 0, activeAssignments: 0, suspendedAssignments: 0,
  uncertainRemoteOperations: 0,
};

describe('remote revocation and seat release safety', () => {
  it('accepts a verified revocation only when no other operation is outstanding', () => {
    expect(reconcileRemoteRevocation(request, receipt, 0)).toEqual({ state: 'CONFIRMED' });
    expect(reconcileRemoteRevocation(request, receipt, 1))
      .toMatchObject({ state: 'RECONCILIATION_REQUIRED', reason: 'CONCURRENT_REMOTE_OPERATION' });
  });
  it('refuses false revocation confirmation if a role is still effective', () => {
    expect(reconcileRemoteRevocation(request, { ...receipt, roleCode: 'ADMIN', effective: true }, 0))
      .toMatchObject({ state: 'RECONCILIATION_REQUIRED' });
  });
  it('refuses cross-company or cross-identity confirmation', () => {
    expect(reconcileRemoteRevocation(request, { ...receipt, remoteCompanyId: 'other' }, 0))
      .toMatchObject({ state: 'RECONCILIATION_REQUIRED' });
    expect(reconcileRemoteRevocation(request, { ...receipt, remoteAuthUserId: 'other' }, 0))
      .toMatchObject({ state: 'RECONCILIATION_REQUIRED' });
  });
  it('does not release seats on suspended, active or pending grants', () => {
    for (const field of Object.keys(empty) as (keyof typeof empty)[]) {
      expect(canReleaseContractSeat({ ...empty, [field]: 1 })).toBe(false);
    }
    expect(canReleaseContractSeat(empty)).toBe(true);
  });
  it('rejects invalid reconciliation counters', () => {
    expect(canReleaseContractSeat({ ...empty, uncertainRemoteOperations: -1 })).toBe(false);
    expect(canReleaseContractSeat({ ...empty, pendingAssignments: NaN })).toBe(false);
  });
});
