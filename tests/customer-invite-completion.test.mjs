import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('customer invitation goes to a public completion page, not admin login', () => {
  const form = read('src/features/auth/components/set-password-form.tsx');
  const middleware = read('src/lib/supabase/middleware.ts');
  const page = read('src/app/ativacao-concluida/page.tsx');

  assert.match(form, /mode === 'invite' \? '\/ativacao-concluida' : '\/login\?password_updated=1'/);
  assert.match(form, /if \(mode === 'invite' && !activated\)/);
  assert.match(middleware, /request.nextUrl.pathname === '\/ativacao-concluida'/);
  assert.match(page, /Senha cadastrada com sucesso/);
  assert.match(page, /provisionamento/);
  assert.doesNotMatch(page, /href="\/"/);
});
