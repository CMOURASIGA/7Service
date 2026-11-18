import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('portal launches only central authorized Commander with no token in URL', () => {
  const page = read('src/app/meus-sistemas/page.tsx');
  const launch = read('src/features/portal/components/commander-launch-button.tsx');
  assert.match(page, /item\.productCode === 'COMMANDER7'/);
  assert.match(page, /item\.status === 'ACTIVE'/);
  assert.match(page, /NEXT_PUBLIC_COMMANDER_SSO_ORIGIN/);
  assert.match(launch, /supabase\.auth\.getUser\(\)/);
  assert.match(launch, /form\.method = 'POST'/);
  assert.match(launch, /field\.name = 'centralAccessToken'/);
  assert.doesNotMatch(launch, /searchParams\.set/);
});
