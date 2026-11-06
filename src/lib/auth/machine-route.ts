/**
 * Only signed M2M entitlement reads and user-access decisions may bypass
 * browser cookies. The actual handlers still verify product-specific tokens.
 */
export function isMachineEntitlementRoute(path: string, method: string): boolean {
  if (method.toUpperCase() === 'GET') {
    return /^\/api\/integrations\/(?:7commander|7clinic)\/entitlements\/[^/]+$/i.test(path);
  }
  if (method.toUpperCase() === 'POST') {
    return /^\/api\/integrations\/(?:7commander|7clinic)\/access\/[^/]+$/i.test(path);
  }
  return false;
}
