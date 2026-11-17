import 'server-only';
import { createHmac, randomUUID } from 'node:crypto';

type RevocationScope = {
  identityId: string;
  clientId: string;
  productCode: 'COMMANDER7';
};

export type RevocationSyncResult =
  { confirmed: true } | { confirmed: false; reason: 'NOT_CONFIGURED' | 'UNCONFIRMED' };

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
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-7service-timestamp': timestamp,
        'x-7service-signature': signature,
      },
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
      return { confirmed: false, reason: 'UNCONFIRMED' };
    const result: unknown = await response.json();
    if (result && typeof result === 'object' && 'confirmed' in result && result.confirmed === true)
      return { confirmed: true };
  } catch {
    // Central authorization remains revoked even if destination is unavailable.
  }
  return { confirmed: false, reason: 'UNCONFIRMED' };
}
