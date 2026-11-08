/**
 * 7Service - contract-scoped named seats.
 *
 * Pure domain rules. Do not replace the current product-scoped subscription
 * enforcement until the contract-seat migration and provisioning E2E pass.
 */
export type GrantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

export interface ContractSeatGrant {
  contractId: string;
  identityId: string;
  productId: string;
  companyId: string;
  installationId: string;
  roleId: string;
  status: GrantStatus;
}

export interface ContractSeatPolicy {
  contractId: string;
  licenseLimit: number;
  allowedProductIds: readonly string[];
  allowedCompanyIds: readonly string[];
}

export type SeatDecision =
  | { allowed: true; occupied: number; available: number; additionalSeats: 0 | 1 }
  | { allowed: false; reason: 'INVALID_POLICY' | 'OUTSIDE_CONTRACT' | 'ROLE_CONFLICT' | 'LIMIT_REACHED'; occupied: number; available: number };

const occupiesSeat = (status: GrantStatus) => status === 'PENDING' || status === 'ACTIVE';

/** One identity uses one contract seat even across products, companies and installations. */
export function countNamedSeats(contractId: string, grants: readonly ContractSeatGrant[]): number {
  return new Set(
    grants.filter((grant) => grant.contractId === contractId && occupiesSeat(grant.status))
      .map((grant) => grant.identityId),
  ).size;
}

/**
 * A single effective role is allowed per identity + product + company + installation.
 * Other companies/products are independent. Reassigning a role requires updating
 * the existing grant, not inserting a parallel grant.
 */
export function evaluateNamedSeatGrant(
  policy: ContractSeatPolicy,
  existing: readonly ContractSeatGrant[],
  requested: ContractSeatGrant,
): SeatDecision {
  const occupied = countNamedSeats(policy.contractId, existing);
  const available = Math.max(0, policy.licenseLimit - occupied);
  const deny = (reason: Exclude<SeatDecision, { allowed: true }>['reason']): SeatDecision =>
    ({ allowed: false, reason, occupied, available });

  if (!Number.isSafeInteger(policy.licenseLimit) || policy.licenseLimit < 0 || !policy.contractId)
    return deny('INVALID_POLICY');
  if (requested.contractId !== policy.contractId ||
      !policy.allowedProductIds.includes(requested.productId) ||
      !policy.allowedCompanyIds.includes(requested.companyId))
    return deny('OUTSIDE_CONTRACT');

  const conflict = existing.some((grant) =>
    grant.contractId === requested.contractId &&
    grant.identityId === requested.identityId &&
    grant.productId === requested.productId &&
    grant.companyId === requested.companyId &&
    grant.installationId === requested.installationId &&
    occupiesSeat(grant.status),
  );
  if (conflict) return deny('ROLE_CONFLICT');

  const alreadyLicensed = existing.some((grant) =>
    grant.contractId === requested.contractId &&
    grant.identityId === requested.identityId &&
    occupiesSeat(grant.status),
  );
  const additionalSeats: 0 | 1 = occupiesSeat(requested.status) && !alreadyLicensed ? 1 : 0;
  if (additionalSeats > available) return deny('LIMIT_REACHED');
  return { allowed: true, occupied, available, additionalSeats };
}
