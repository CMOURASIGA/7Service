/**
 * Narrowly identifies M2M entitlement GET endpoints. The matched handler
 * performs independent product-specific Bearer verification and tenant lookup.
 * This does not authorize any user or bypass application RLS.
 */
export function isMachineEntitlementRoute(path: string, method: string): boolean {
  if (method.toUpperCase() !== 'GET') return false;
  return /^\/api\/integrations\/(?:7commander|7clinic)\/entitlements\/[^/]+$/i.test(path);
}
