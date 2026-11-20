import 'server-only';
import { createHmac } from 'node:crypto';

export type AccountCheck = { identityId: string; clientId: string; roleCode: string };
export type AccountState = 'CONFIRMED' | 'PENDING' | 'MISMATCH';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Read-only signed status query, only from a trusted Commander origin. */
export async function readCommanderAccountStates(checks: AccountCheck[]): Promise<Map<string, AccountState>> {
  const result = new Map<string, AccountState>();
  const secret = process.env.SERVICE_COMMANDER_REVOCATION_SECRET;
  const originValue = process.env.NEXT_PUBLIC_COMMANDER_SSO_ORIGIN;
  if (!secret || secret.length < 32 || !originValue) return result;
  let endpoint: URL;
  try {
    const origin = new URL(originValue);
    if (origin.protocol !== 'https:' || origin.username || origin.password ||
        origin.port || origin.pathname !== '/' || origin.search || origin.hash)
      return result;
    endpoint = new URL('/api/integrations/7service/account-status', origin);
  } catch { return result; }
  const eligible = checks.filter((c) => uuid.test(c.identityId) && uuid.test(c.clientId) &&
    ['VIEWER','MEMBER','ADMIN','OWNER'].includes(c.roleCode));
  const unique = [...new Map(eligible.map(c => [c.identityId + ':' + c.clientId, c])).values()];
  for (let offset = 0; offset < unique.length; offset += 40) {
    const batch = unique.slice(offset, offset + 40);
    const body = JSON.stringify({ operation: 'CHECK_ACCOUNTS', checks: batch });
    const timestamp = String(Date.now());
    const signature = createHmac('sha256', secret).update(timestamp + '.' + body).digest('hex');
    try {
      const response = await fetch(endpoint, {
        method: 'POST', cache: 'no-store', redirect: 'error',
        headers: { 'Content-Type': 'application/json',
          'x-7service-timestamp': timestamp, 'x-7service-signature': signature },
        body, signal: AbortSignal.timeout(6000),
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        console.warn('[account-reconciliation] destination status unavailable', { httpStatus: response.status });
        continue;
      }
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('results' in data) ||
          !Array.isArray(data.results) || data.results.length !== batch.length) continue;
      const allowed = new Set(batch.map(c => c.identityId + ':' + c.clientId));
      for (const item of data.results) {
        if (!item || typeof item !== 'object') continue;
        const r = item as Record<string, unknown>;
        const key = r.identityId + ':' + r.clientId;
        if (allowed.has(key) && (r.state === 'CONFIRMED' || r.state === 'PENDING' || r.state === 'MISMATCH'))
          result.set(key, r.state);
      }
    } catch {
      console.warn('[account-reconciliation] destination query failed');
    }
  }
  return result;
}
