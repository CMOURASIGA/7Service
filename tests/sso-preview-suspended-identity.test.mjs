import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('SSO uses GET launcher and strict opener messaging, not protected cross-origin POST', () => {
  const code = read('src/features/portal/components/commander-launch-button.tsx');
  assert.match(code, /window\.open\(origin \+ '\/portal-start'/);
  assert.match(code, /event\.origin !== origin/);
  assert.match(code, /event\.source !== popup/);
  assert.match(code, /supabase\.auth\.getUser\(\)/);
  assert.match(code, /popup\.postMessage/);
  assert.doesNotMatch(code, /form\.method = 'POST'/);
});
test('suspended identity cannot create partial membership or reserve license', () => {
  const action = read('src/app/(admin)/usuarios/actions.ts');
  const detail = read('src/app/(admin)/usuarios/[id]/page.tsx');
  const recovery = read('src/app/(admin)/usuarios/[id]/actions.ts');
  const gate = action.indexOf("identity?.status === 'SUSPENDED'");
  assert.ok(gate > 0 && gate < action.indexOf('const { data: existingMembership'));
  assert.match(detail, /Preparar identidade para novo convite/);
  assert.match(recovery, /identity\.suspension_reviewed_for_invitation/);
  assert.match(recovery, /requirePermission\('users\.manage'\)/);
});
