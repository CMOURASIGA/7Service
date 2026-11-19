import { describe, expect, it, vi } from 'vitest';
import {
  verifyProductProvisioning,
  verifyProductProvisioningReceipt,
  type ProductProvisioningRequest,
} from './product-provisioning-contract';

const request: ProductProvisioningRequest = {
  requestId: 'request-1',
  centralIdentityId: 'central-1',
  remoteAuthUserId: 'remote-1',
  companyId: 'company-1',
  remoteCompanyId: 'tenant-a',
  productCode: 'COMMANDER7',
  roleCode: 'ADMIN',
  action: 'GRANT',
};
const receipt = {
  requestId: 'request-1',
  remoteAuthUserId: 'remote-1',
  remoteCompanyId: 'tenant-a',
  productCode: 'COMMANDER7',
  roleCode: 'ADMIN',
  effective: true,
  revision: 'rev-00000001',
};
describe('destination profile enforcement contract', () => {
  it('requires exact company, user, product and role match', () => {
    expect(verifyProductProvisioningReceipt(request, receipt)).toBe(true);
    expect(
      verifyProductProvisioningReceipt(request, { ...receipt, remoteCompanyId: 'tenant-b' }),
    ).toBe(false);
    expect(verifyProductProvisioningReceipt(request, { ...receipt, roleCode: 'READER' })).toBe(
      false,
    );
    expect(
      verifyProductProvisioningReceipt(request, { ...receipt, remoteAuthUserId: 'remote-2' }),
    ).toBe(false);
  });
  it('requires an effective revocation with no remaining role', () => {
    expect(
      verifyProductProvisioningReceipt(
        { ...request, action: 'REVOKE' },
        { ...receipt, roleCode: null, effective: false },
      ),
    ).toBe(true);
    expect(verifyProductProvisioningReceipt({ ...request, action: 'REVOKE' }, receipt)).toBe(false);
  });
  it('reads effective access after apply to prevent false success', async () => {
    const adapter = {
      apply: vi.fn().mockResolvedValue(receipt),
      readEffectiveAccess: vi.fn().mockResolvedValue({ ...receipt, effective: false }),
    };
    await expect(verifyProductProvisioning(adapter, request)).rejects.toThrow(
      'PRODUCT_EFFECTIVE_ACCESS_MISMATCH',
    );
    expect(adapter.readEffectiveAccess).toHaveBeenCalledOnce();
  });
});
