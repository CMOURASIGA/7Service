import 'server-only';

import { destinationAdminClient, type SealedCredential } from './supabase-connector';
import type {
  ProductProvisioningAdapter,
  ProductProvisioningReceipt,
  ProductProvisioningRequest,
} from './product-provisioning-contract';

/**
 * Uniform Supabase RPC contract for Consult Services products.
 *
 * Destination products must deploy and secure the two RPCs themselves:
 *   service_apply_profile_v1(p_payload jsonb) -> jsonb
 *   service_read_profile_v1(p_payload jsonb) -> jsonb
 *
 * Both RPCs must enforce tenant/company, idempotency, product/role mapping,
 * central authorization, access-revocation and audit in the destination.
 * These RPCs do NOT exist automatically when a connection is registered.
 *
 * The 7Service never marks an operation CONFIRMED based on Auth user creation
 * or successful apply() alone; a separate readback is required.
 */

type RpcResult = { data: unknown; error: { message: string } | null };
type RpcTransport = (method: string, args: { p_payload: Record<string, string> }) =>
  Promise<RpcResult>;

function toPayload(request: ProductProvisioningRequest): Record<string, string> {
  return {
    request_id: request.requestId,
    central_identity_id: request.centralIdentityId,
    remote_auth_user_id: request.remoteAuthUserId,
    central_company_id: request.companyId,
    remote_company_id: request.remoteCompanyId,
    product_code: request.productCode,
    role_code: request.roleCode,
    operation: request.action,
  };
}

/** Decode only exact, expected receipt fields and reject ambiguous responses. */
export function decodeProvisioningReceipt(value: unknown): ProductProvisioningReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('INVALID_PRODUCT_PROVISIONING_RECEIPT');
  const row = value as Record<string, unknown>;
  if (typeof row.request_id !== 'string' ||
      typeof row.remote_auth_user_id !== 'string' ||
      typeof row.remote_company_id !== 'string' ||
      typeof row.product_code !== 'string' ||
      !(typeof row.role_code === 'string' || row.role_code === null) ||
      typeof row.effective !== 'boolean' ||
      typeof row.revision !== 'string') {
    throw new Error('INVALID_PRODUCT_PROVISIONING_RECEIPT');
  }
  return {
    requestId: row.request_id,
    remoteAuthUserId: row.remote_auth_user_id,
    remoteCompanyId: row.remote_company_id,
    productCode: row.product_code,
    roleCode: row.role_code,
    effective: row.effective,
    revision: row.revision,
  };
}

export function createRpcProductProvisioningAdapter(rpc: RpcTransport): ProductProvisioningAdapter {
  async function invoke(method: string, request: ProductProvisioningRequest) {
    const { data, error } = await rpc(method, { p_payload: toPayload(request) });
    if (error) throw new Error('DESTINATION_PROFILE_RPC_FAILED');
    return decodeProvisioningReceipt(data);
  }
  return {
    apply: request => invoke('service_apply_profile_v1', request),
    readEffectiveAccess: request => invoke('service_read_profile_v1', request),
  };
}

/** Server-only privileged connector, never export to a client component. */
export function createSupabaseProductProvisioningAdapter(
  projectUrl: string,
  encryptedKey: SealedCredential,
): ProductProvisioningAdapter {
  const client = destinationAdminClient(projectUrl, encryptedKey);
  return createRpcProductProvisioningAdapter(async (method, args) => {
    // Method names are from an internal hardcoded allowlist, never user input.
    if (method !== 'service_apply_profile_v1' && method !== 'service_read_profile_v1')
      throw new Error('INVALID_DESTINATION_METHOD');
    const { data, error } = await client.rpc(method, args);
    return { data, error };
  });
}
