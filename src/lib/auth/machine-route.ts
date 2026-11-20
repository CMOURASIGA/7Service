/**
 * Only specifically scoped M2M routes may bypass browser cookies.
 * Their handlers still require a valid machine token or HMAC signature.
 */
export function isMachineEntitlementRoute(path: string, method: string): boolean {
  if (method.toUpperCase() === 'GET') {
    return /^\/api\/integrations\/(?:7commander|7clinic)\/entitlements\/[^/]+$/i.test(path);
  }
  if (method.toUpperCase() === 'POST') {
    return /^\/api\/integrations\/(?:7commander|7clinic)\/access\/[^/]+$/i.test(path) ||
      path === '/api/integrations/7commander/regrant-decision';
  }
  return false;
}
