import 'server-only';
import { createHmac, randomUUID } from 'node:crypto';

type RevocationScope = {
  identityId: string;
  clientId: string;
  productCode: 'COMMANDER7';
};

export type RevocationSyncResult =
  | { confirmed: true }
  | {
      confirmed: false;
      reason:
        | 'NOT_CONFIGURED'
        | 'DESTINATION_PROTECTED'
        | 'DESTINATION_REJECTED'
        | 'DESTINATION_UNAVAILABLE'
        | 'DESTINATION_TIMEOUT'
        | 'DESTINATION_REDIRECT'
        | 'UNCONFIRMED';
    };

/**
 * Only sends a restricted, signed *revocation* intent. The Commander
 * independently resolves both central IDs through its approved mappings.
 * Never send user email, a database key, or a destination user ID.
 */
async function syncCommanderAccessChange(
  scope: RevocationScope,
  operation: 'SUSPEND' | 'RESTORE',
): Promise<RevocationSyncResult> {
  const destination = process.env.SERVICE_COMMANDER_REVOCATION_URL;
  const secret = process.env.SERVICE_COMMANDER_REVOCATION_SECRET;
  if (!destination || !secret || secret.length < 32) {
    return { confirmed: false, reason: 'NOT_CONFIGURED' };
  }
  try {
    const url = new URL(destination);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/api/integrations/7service/revocation'
    )
      return { confirmed: false, reason: 'NOT_CONFIGURED' };

    const timestamp = String(Date.now());
    const body = JSON.stringify({
      eventId: randomUUID(),
      identityId: scope.identityId,
      clientId: scope.clientId,
      productCode: scope.productCode,
      operation,
    });
    const signature = createHmac('sha256', secret)
      .update(timestamp + '.' + body)
      .digest('hex');
    // Preview protection remains enabled. The automation bypass is a server-only
    // deployment credential; the Commander still requires a valid HMAC signature
    // and checks both explicit central mappings before changing local access.
    const bypass = process.env.SERVICE_COMMANDER_VERCEL_AUTOMATION_BYPASS_SECRET;
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-7service-timestamp': timestamp,
      'x-7service-signature': signature,
    };
    if (bypass) headers['x-vercel-protection-bypass'] = bypass;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    if (response.status >= 300 && response.status < 400) {
      // Record only a safe classification, never the redirect URL or bypass token.
      const location = response.headers.get('location');
      const redirectHost = location ? new URL(location, url).hostname : '';
      const isVercelAuth =
        redirectHost === 'vercel.com' ||
        redirectHost.endsWith('.vercel.com') ||
        redirectHost === 'vercel.app' ||
        redirectHost.endsWith('.vercel.app');
      console.warn('[revocation-sync] destination redirected', {
        status: response.status,
        destination: isVercelAuth ? 'vercel-authentication' : 'other',
      });
      return { confirmed: false, reason: 'DESTINATION_REDIRECT' };
    }
    // A Vercel authentication page is HTML, not the signed JSON response.
    // Distinguish that failure from a valid application-level rejection.
    const jsonResponse = response.headers.get('content-type')?.includes('application/json');
    if (!jsonResponse) {
      return { confirmed: false, reason: 'DESTINATION_PROTECTED' };
    }
    if (!response.ok) {
      return { confirmed: false, reason: 'DESTINATION_REJECTED' };
    }
    const result: unknown = await response.json();
    if (result && typeof result === 'object' && 'confirmed' in result && result.confirmed === true)
      return { confirmed: true };
  } catch (error) {
    // Fail closed; never expose the signed payload, credentials or destination URL in logs.
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return { confirmed: false, reason: 'DESTINATION_TIMEOUT' };
    }
    return { confirmed: false, reason: 'DESTINATION_UNAVAILABLE' };
  }
  return { confirmed: false, reason: 'UNCONFIRMED' };
}

/** Called only after the administrator has issued a new, active central grant. */
export async function syncCommanderRestoration(scope: RevocationScope): Promise<RevocationSyncResult> {
  return syncCommanderAccessChange(scope, 'RESTORE');
}

export async function syncCommanderRevocation(scope: RevocationScope): Promise<RevocationSyncResult> {
  return syncCommanderAccessChange(scope, 'SUSPEND');
}
