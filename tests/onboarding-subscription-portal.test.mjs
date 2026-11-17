import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('client navigation is separated into five tabs', () => {
  const page = read('src/app/(admin)/clientes/[id]/page.tsx');
  for (const label of ['Dados cadastrais', 'Contratos', 'Produtos', 'Usuários', 'Funcionalidades']) {
    assert.ok(page.includes(label));
  }
  assert.match(page, /activeTab === 'dados'/);
});

test('registration grants only the selected and verified client product', () => {
  const action = read('src/app/(admin)/usuarios/actions.ts');
  const form = read('src/features/identities/components/new-identity-form.tsx');
  assert.match(action, /subscription\.data\.product_id !== role\.data\.product_id/);
  assert.match(action, /grant_product_access_atomic/);
  assert.match(action, /p_actor: internalUser\.id/);
  assert.match(form, /Limite de licenças atingido/);
  assert.match(form, /licensesUsed/);
});

test('product portal fails closed before destination provisioning is verified', () => {
  const portal = read('src/app/meus-sistemas/page.tsx');
  assert.match(portal, /auth\.auth\.getUser\(\)/);
  assert.match(portal, /eq\('auth_user_id', data\.user\.id\)/);
  assert.match(portal, /client_memberships/);
  assert.match(portal, /Acesso pendente de confirmação/);
  assert.match(portal, /disabled/);
});
