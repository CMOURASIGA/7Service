import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('revocation confirmation distinguishes protected preview, rejected JSON, and network errors', () => {
  const sender = read('src/lib/integrations/commander-revocation.ts');
  const action = read('src/app/(admin)/usuarios/[id]/memberships/actions.ts');
  for (const reason of [
    'NOT_CONFIGURED',
    'DESTINATION_PROTECTED',
    'DESTINATION_REJECTED',
    'DESTINATION_UNAVAILABLE',
    'UNCONFIRMED',
  ]) {
    assert.match(sender, new RegExp(reason));
    assert.match(action, new RegExp(reason));
  }
  assert.match(sender, /response\.headers\.get\('content-type'\)/);
  assert.match(sender, /'confirmed' in result && result\.confirmed === true/);
  assert.match(action, /A revogação central permanece efetiva/);
  assert.doesNotMatch(sender, /operation: 'GRANT'/);
});
