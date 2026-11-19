import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import {
  createRpcProductProvisioningAdapter,
  decodeProvisioningReceipt,
} from './supabase-product-adapter';
import { verifyProductProvisioning } from './product-provisioning-contract';
import type { ProductProvisioningRequest } from './product-provisioning-contract';

const request: ProductProvisioningRequest = {
  requestId: 'request-123',
  centralIdentityId: 'central-user',
  remoteAuthUserId: 'remote-user',
  companyId: 'central-company',
  remoteCompanyId: 'tenant-one',
  productCode: 'COMMANDER7',
  roleCode: 'ADMIN',
  action: 'GRANT',
};
const receipt = {
  request_id: 'request-123',
  remote_auth_user_id: 'remote-user',
  remote_company_id: 'tenant-one',
  product_code: 'COMMANDER7',
  role_code: 'ADMIN',
  effective: true,
  revision: 'revision-2026-11-08',
};
describe('generic destination Supabase profile adapter', () => {
  it('fails closed on malformed receipts', () => {
    expect(() => decodeProvisioningReceipt({ ...receipt, effective: 'true' })).toThrow(
      'INVALID_PRODUCT_PROVISIONING_RECEIPT',
    );
    expect(() => decodeProvisioningReceipt({ ...receipt, role_code: undefined })).toThrow(
      'INVALID_PRODUCT_PROVISIONING_RECEIPT',
    );
  });
  it('calls write and readback RPCs with the same tenant-bound payload', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: receipt, error: null });
    const adapter = createRpcProductProvisioningAdapter(rpc);
    await expect(verifyProductProvisioning(adapter, request)).resolves.toMatchObject({
      effective: true,
      roleCode: 'ADMIN',
    });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0][0]).toBe('service_apply_profile_v1');
    expect(rpc.mock.calls[1][0]).toBe('service_read_profile_v1');
    expect(rpc.mock.calls[0][1].p_payload.remote_company_id).toBe('tenant-one');
    expect(rpc.mock.calls[1][1].p_payload.central_identity_id).toBe('central-user');
  });
  it('does not confirm if the readback disagrees with the requested role', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: receipt, error: null })
      .mockResolvedValueOnce({ data: { ...receipt, role_code: 'READER' }, error: null });
    await expect(
      verifyProductProvisioning(createRpcProductProvisioningAdapter(rpc), request),
    ).rejects.toThrow('PRODUCT_EFFECTIVE_ACCESS_MISMATCH');
  });
  it('never exposes remote error details', async () => {
    const adapter = createRpcProductProvisioningAdapter(async () => ({
      data: null,
      error: { message: 'remote secret / unexpected details' },
    }));
    await expect(adapter.apply(request)).rejects.toThrow('DESTINATION_PROFILE_RPC_FAILED');
  });
});
