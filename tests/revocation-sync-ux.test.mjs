import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('signed Commander revocation keeps HMAC and optional server-only preview bypass', () => {
  const sender = read('src/lib/integrations/commander-revocation.ts');
  assert.match(sender, /createHmac\('sha256', secret\)/);
  assert.match(sender, /SERVICE_COMMANDER_REVOCATION_SECRET/);
  assert.match(sender, /SERVICE_COMMANDER_VERCEL_AUTOMATION_BYPASS_SECRET/);
  assert.match(sender, /headers\['x-vercel-protection-bypass'\] = bypass/);
  assert.match(sender, /syncCommanderAccessChange\(scope, 'SUSPEND'\)/);
  assert.doesNotMatch(sender, /operation: 'GRANT'/);
});

test('license UI distinguishes pending, suspended, revoked and expired states', () => {
  const page = read('src/app/(admin)/usuarios/[id]/page.tsx');
  assert.match(page, /a\.status === 'PENDING'/);
  assert.match(page, /a\.status === 'SUSPENDED'/);
  assert.match(page, /a\.status === 'REVOKED'/);
  assert.match(page, /a\.status === 'EXPIRED'/);
  assert.match(page, /Licença revogada definitivamente/);
  assert.match(page, /sincronização técnica/);
  assert.doesNotMatch(page, /Aguardando ativação\. Não distribuir credenciais/);
});

test('revoked grants have no misleading Reactivate action; retries require central revocation', () => {
  const page = read('src/app/(admin)/usuarios/[id]/page.tsx');
  const actions = read('src/app/(admin)/usuarios/[id]/memberships/actions.ts');
  assert.match(page, /a\.status === 'SUSPENDED' \|\| a\.status === 'REVOKED'/);
  assert.match(actions, /stillActive/);
  assert.match(actions, /syncCommanderRevocation/);
  assert.match(page, /a\.status !== 'REVOKED'/);
});


test('regrant decision uses the existing signed channel and verifies a current license', () => {
  const endpoint=read('src/app/api/integrations/7commander/regrant-decision/route.ts');
  assert.match(endpoint,/SERVICE_COMMANDER_REVOCATION_SECRET/);
  assert.match(endpoint,/timingSafeEqual/);
  assert.match(endpoint,/Math.abs\(Date.now\(\)-Number\(stamp\)\)>60000/);
  assert.match(endpoint,/v.operation!=='CHECK_REGRANT'/);
  assert.match(endpoint,/v.productCode!=='COMMANDER7'/);
  assert.match(endpoint,/subscriptionInAccessWindow/);
  assert.match(endpoint,/\.eq\('status','ACTIVE'\)/);
  assert.match(endpoint,/codes.length===1/);
  assert.doesNotMatch(endpoint,/machineProductSecret/);
});

test('regrant timestamp validator accepts milliseconds, rejects malformed and stale input', () => {
  const endpoint=read('src/app/api/integrations/7commander/regrant-decision/route.ts');
  const correct=String.raw`/^\d{13}$/`;
  const incorrect=String.raw`/^\\d{13}$/`;
  assert.ok(endpoint.includes(correct),'HMAC endpoint must recognize 13 decimal digits');
  assert.ok(!endpoint.includes(incorrect),'HMAC endpoint must never double-escape \\d');
  const numeric=/^\d{13}$/;
  assert.equal(numeric.test(String(Date.now())),true);
  assert.equal(numeric.test('no-timestamp'),false);
  assert.equal(numeric.test('123456789012'),false);
  const now=Date.now();
  assert.equal(Math.abs(now-(now-61_000))>60_000,true);
});

test('confirmed Commander restoration returns positive feedback and the dialog renders it', () => {
  const actions=read('src/app/(admin)/usuarios/[id]/actions.ts');
  const widget=read('src/components/ui/confirm-action.tsx');
  assert.match(actions,/Reativação sincronizada e confirmada no Commander/);
  assert.match(widget,/feedback\?\.success/);
  assert.match(widget,/role="status"/);
  assert.match(widget,/setFeedback\(\{ success: result\.success \}\)/);
});
