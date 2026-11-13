/**
 * Contract required from every destination application.
 *
 * Remote Auth creation alone does not grant access. The destination must
 * atomically enforce company+product+profile and return an attested state.
 * The 7Service coordinator may mark success only after querying this state.
 */
export interface ProductProvisioningRequest {
  requestId: string;
  centralIdentityId: string;
  remoteAuthUserId: string;
  companyId: string;
  remoteCompanyId: string;
  productCode: string;
  roleCode: string;
  action: 'GRANT' | 'REVOKE' | 'CHANGE_ROLE';
}
export interface ProductProvisioningReceipt {
  requestId: string;
  remoteAuthUserId: string;
  remoteCompanyId: string;
  productCode: string;
  roleCode: string | null;
  effective: boolean;
  revision: string;
}

export function verifyProductProvisioningReceipt(
  request: ProductProvisioningRequest,
  receipt: ProductProvisioningReceipt,
): boolean {
  if (!receipt.revision || !/^[a-zA-Z0-9:_-]{8,128}$/.test(receipt.revision)) return false;
  if (
    receipt.requestId !== request.requestId ||
    receipt.remoteAuthUserId !== request.remoteAuthUserId ||
    receipt.remoteCompanyId !== request.remoteCompanyId ||
    receipt.productCode !== request.productCode
  )
    return false;
  if (request.action === 'REVOKE') return receipt.effective === false && receipt.roleCode === null;
  return receipt.effective === true && receipt.roleCode === request.roleCode;
}

export interface ProductProvisioningAdapter {
  apply(request: ProductProvisioningRequest): Promise<ProductProvisioningReceipt>;
  readEffectiveAccess(request: ProductProvisioningRequest): Promise<ProductProvisioningReceipt>;
}

/** Never mark an operation confirmed merely because apply() returned HTTP 200. */
export async function verifyProductProvisioning(
  adapter: ProductProvisioningAdapter,
  request: ProductProvisioningRequest,
): Promise<ProductProvisioningReceipt> {
  const applied = await adapter.apply(request);
  if (!verifyProductProvisioningReceipt(request, applied))
    throw new Error('PRODUCT_PROVISIONING_RECEIPT_MISMATCH');
  const observed = await adapter.readEffectiveAccess(request);
  if (!verifyProductProvisioningReceipt(request, observed))
    throw new Error('PRODUCT_EFFECTIVE_ACCESS_MISMATCH');
  return observed;
}
