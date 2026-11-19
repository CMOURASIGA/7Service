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
  assert.match(sender, /operation: 'SUSPEND'/);
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
