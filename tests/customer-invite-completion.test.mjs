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

test('OTP only confirms mailbox; account activation is finalized after password', () => {
  const migration = read('supabase/migrations/20261120163800_defer_invite_activation_until_password.sql');
  const eligibility = read('src/app/api/auth/invite-eligibility/route.ts');
  const form = read('src/features/auth/components/set-password-form.tsx');
  assert.match(migration, /status='PENDING_INVITE'/);
  assert.match(migration, /UPDATE public\.invitations SET status='ACCEPTED'/);
  assert.match(migration, /UPDATE public\.user_product_access a/);
  const confirmation = migration.split('CREATE OR REPLACE FUNCTION public.activate_identity_after_auth_confirmation()')[1].split('CREATE OR REPLACE FUNCTION public.activate_identity_after_auth_atomic')[0];
  assert.doesNotMatch(confirmation, /UPDATE public\.identities/);
  assert.match(eligibility, /identity\.data\.status === 'PENDING_INVITE'/);
  assert.match(eligibility, /\.eq\('status', 'PENDING'\)/);
  assert.match(eligibility, /\.eq\('status', 'ACCEPTED'\)/);
  assert.match(eligibility, /age < 24 \* 60 \* 60 \* 1000/);
  assert.match(form, /await supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.match(form, /fetch\('\/api\/auth\/activate', \{ method: 'POST' \}\)/);
});
