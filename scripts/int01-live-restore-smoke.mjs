import { createHmac, randomUUID } from 'node:crypto';

// Opt-in, preview-only, one-shot verification of the full Access -> Commander
// RESTORE path. This is invoked during build while service credentials are
// available. Never execute for production and never log secrets or user IDs.
const scope = process.env.INT01_E2E_RESTORE_SCOPE;
if (!scope) {
  process.stdout.write('[INT01 E2E] Not requested.\n');
  process.exit(0);
}
if (process.env.VERCEL_ENV !== 'preview' ||
    process.env.VERCEL_GIT_COMMIT_REF !== 'develop') {
  throw new Error('[INT01 E2E] Refusing non-develop preview execution');
}
const [identityId, clientId] = scope.split(':');
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
if (!uuid.test(identityId ?? '') || !uuid.test(clientId ?? '')) {
  throw new Error('[INT01 E2E] Invalid scoped test identifiers');
}
const dest = new URL(process.env.SERVICE_COMMANDER_REVOCATION_URL ?? '');
if (dest.protocol !== 'https:' || dest.username || dest.password ||
    dest.search || dest.hash ||
    dest.pathname !== '/api/integrations/7service/revocation') {
  throw new Error('[INT01 E2E] Invalid restricted integration destination');
}
const secret = process.env.SERVICE_COMMANDER_REVOCATION_SECRET ?? '';
const bypass = process.env.SERVICE_COMMANDER_VERCEL_AUTOMATION_BYPASS_SECRET ?? '';
if (secret.length < 32 || bypass.length < 20) {
  throw new Error('[INT01 E2E] Signed channel / preview bypass not configured');
}
const timestamp = String(Date.now());
const body = JSON.stringify({
  eventId: randomUUID(), identityId, clientId, productCode: 'COMMANDER7',
  operation: 'RESTORE'
});
const signature = createHmac('sha256', secret)
  .update(timestamp + '.' + body).digest('hex');
let response;
try {
  response = await fetch(dest, {
    method: 'POST', redirect: 'manual', cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      'x-vercel-protection-bypass': bypass,
      'x-7service-timestamp': timestamp,
      'x-7service-signature': signature
    },
    body, signal: AbortSignal.timeout(15000)
  });
} catch (error) {
  console.error('[INT01 E2E] RESTORE unreachable', {type:error?.name ?? 'Unknown'});
  process.exit(1);
}
const contentType = response.headers.get('content-type') ?? '';
let confirmation = null;
if (contentType.includes('application/json')) {
  try { confirmation = await response.json(); } catch {}
}
if (response.status !== 200 || confirmation?.confirmed !== true) {
  // Only reveal status and a fixed set of error codes, no response payload.
  const known = ['Unauthorized','Approved mapping required',
    'Central confirmation unavailable','Central grant and local role must match',
    'Verified local identity required','No recorded central suspension to restore',
    'Updated, audit confirmation pending','Restoration not confirmed'];
  const reason = known.includes(confirmation?.error) ? confirmation.error : 'Unclassified';
  console.error('[INT01 E2E] FAIL', {
    status: response.status, reason, json:contentType.includes('application/json')
  });
  process.exit(1);
}
console.log('[INT01 E2E] PASS: signed RESTORE confirmed end-to-end');
