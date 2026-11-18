import 'server-only';
import { createHmac, randomUUID } from 'node:crypto';

type RevocationScope = {
  identityId: string;
  clientId: string;
  productCode: 'COMMANDER7';
};

export type RevocationSyncResult =
  { confirmed: true } | { confirmed: false; reason: 'NOT_CONFIGURED' | 'DESTINATION_PROTECTED' | 'DESTINATION_REJECTED' | 'DESTINATION_UNAVAILABLE' | 'UNCONFIRMED' };

/**
 * Only sends a restricted, signed *revocation* intent. The Commander
 * independently resolves both central IDs through its approved mappings.
 * Never send user email, a database key, or a destination user ID.
 */
export async function syncCommanderRevocation(
  scope: RevocationScope,
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
      operation: 'SUSPEND',
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
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
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
  } catch {
    // Fail closed. Network or timeout errors never reactivate central access.
    return { confirmed: false, reason: 'DESTINATION_UNAVAILABLE' };
  }
  return { confirmed: false, reason: 'UNCONFIRMED' };
}
