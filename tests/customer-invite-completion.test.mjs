import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('activated customer is sent to the personal portal, not the admin login', () => {
  const form = read('src/features/auth/components/set-password-form.tsx');
  const middleware = read('src/lib/supabase/middleware.ts');
  const portal = read('src/app/meus-sistemas/page.tsx');

  assert.match(form, /router\.replace\('\/meus-sistemas'\)/);
  assert.match(form, /if \(mode === 'invite' && !activated\)/);
  assert.match(middleware, /request\.nextUrl\.pathname === '\/meus-sistemas'/);
  assert.match(portal, /auth\.auth\.getUser\(\)/);
  assert.match(portal, /auth_user_id/);
  assert.match(portal, /Acesso pendente de confirmação/);
});
