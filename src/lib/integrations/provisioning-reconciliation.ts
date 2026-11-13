import {
  type ProductProvisioningReceipt,
  type ProductProvisioningRequest,
  verifyProductProvisioningReceipt,
} from './product-provisioning-contract';

/** Authorization state in 7Service and observed state in the destination are separate facts. */
export interface ReconciliationSnapshot {
  centralGrantActive: boolean;
  contractActive: boolean;
  seatReserved: boolean;
  connectionVerified: boolean;
  identityActive: boolean;
  companyActive: boolean;
  localAuthLinked: boolean;
  productReceipt: ProductProvisioningReceipt | null;
}
export type ReconciliationDecision =
  | { state: 'CONFIRMED'; operation: 'NONE' }
  | { state: 'BLOCKED'; operation: 'REVOKE' | 'INVESTIGATE'; reason: string }
  | { state: 'PENDING'; operation: 'INVITE' | 'APPLY_PROFILE' | 'VERIFY_PROFILE'; reason: string };

/**
 * A connected Auth account alone is never sufficient proof of authorization.
 * Any ineligible contract, client, identity, seat or connection fails closed.
 */
export function reconcileDestinationAccess(
  request: ProductProvisioningRequest,
  snapshot: ReconciliationSnapshot,
): ReconciliationDecision {
  const centralAllowed =
    snapshot.centralGrantActive &&
    snapshot.contractActive &&
    snapshot.seatReserved &&
    snapshot.connectionVerified &&
    snapshot.identityActive &&
    snapshot.companyActive;

  if (!centralAllowed) {
    if (snapshot.productReceipt?.effective)
      return {
        state: 'BLOCKED',
        operation: 'REVOKE',
        reason: 'CENTRAL_ACCESS_DENIED_REMOTE_ACTIVE',
      };
    return { state: 'BLOCKED', operation: 'INVESTIGATE', reason: 'CENTRAL_ACCESS_DENIED' };
  }
  if (!snapshot.localAuthLinked)
    return { state: 'PENDING', operation: 'INVITE', reason: 'DESTINATION_AUTH_NOT_LINKED' };
  if (!snapshot.productReceipt)
    return {
      state: 'PENDING',
      operation: 'APPLY_PROFILE',
      reason: 'DESTINATION_PROFILE_UNVERIFIED',
    };
  if (!verifyProductProvisioningReceipt(request, snapshot.productReceipt))
    return {
      state: 'PENDING',
      operation: 'VERIFY_PROFILE',
      reason: 'DESTINATION_PROFILE_MISMATCH',
    };
  return { state: 'CONFIRMED', operation: 'NONE' };
}

/** A revocation is confirmed only after an authenticated destination readback. */
export function reconcileRemoteRevocation(
  request: ProductProvisioningRequest,
  receipt: ProductProvisioningReceipt | null,
  outstandingOperations: number,
): { state: 'CONFIRMED' | 'RECONCILIATION_REQUIRED'; reason?: string } {
  if (request.action !== 'REVOKE')
    return {
      state: 'RECONCILIATION_REQUIRED',
      reason: 'NOT_A_REVOCATION',
    };
  if (outstandingOperations !== 0)
    return {
      state: 'RECONCILIATION_REQUIRED',
      reason: 'CONCURRENT_REMOTE_OPERATION',
    };
  if (!receipt || !verifyProductProvisioningReceipt(request, receipt))
    return {
      state: 'RECONCILIATION_REQUIRED',
      reason: 'REMOTE_REVOCATION_NOT_VERIFIED',
    };
  return { state: 'CONFIRMED' };
}

/** A seat is never released while legacy or new effective grants exist. */
export function canReleaseContractSeat(input: {
  pendingLegacyGrants: number;
  activeLegacyGrants: number;
  suspendedLegacyGrants: number;
  pendingAssignments: number;
  activeAssignments: number;
  suspendedAssignments: number;
  uncertainRemoteOperations: number;
}): boolean {
  return Object.values(input).every((count) => Number.isSafeInteger(count) && count === 0);
}
