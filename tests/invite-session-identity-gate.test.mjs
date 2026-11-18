import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('invitation password updates require a matching pending server identity', () => {
  const route = read('src/app/api/auth/invite-eligibility/route.ts');
  const form = read('src/features/auth/components/set-password-form.tsx');
  assert.match(route, /auth\.auth\.getUser\(\)/);
  assert.match(route, /eq\('auth_user_id', user\.id\)/);
  assert.match(route, /PENDING_INVITE/);
  assert.match(route, /identity\.data\.email\.toLowerCase\(\)/);
  const verify = form.indexOf("fetch('/api/auth/invite-eligibility'");
  const update = form.indexOf('supabase.auth.updateUser({ password })');
  assert.ok(verify >= 0 && verify < update);
  assert.match(form, /Convite destinado a:/);
  assert.match(form, /Esta sessão não corresponde a um convite pendente/);
});
