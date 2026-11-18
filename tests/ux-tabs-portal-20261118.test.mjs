import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('client and users use existing keyboard-accessible local tabs without URL navigation', () => {
  const client = read('src/app/(admin)/clientes/[id]/page.tsx');
  const users = read('src/app/(admin)/usuarios/page.tsx');
  const tabs = read('src/components/ui/workspace-tabs.tsx');
  assert.match(client, /<WorkspaceTabs/);
  assert.match(users, /<WorkspaceTabs/);
  assert.doesNotMatch(client, /\?aba=\$\{value\}/);
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /aria-selected/);
  assert.match(tabs, /ArrowRight/);
  assert.match(tabs, /hidden=\{index !== i\}/);
});
test('portal never claims local provisioning without a verified destination response', () => {
  const portal = read('src/app/meus-sistemas/page.tsx');
  assert.match(portal, /auth\.auth\.getUser\(\)/);
  assert.match(portal, /A conexão com o produto ainda não foi verificada por este portal/);
  assert.match(portal, /Acesso pelo portal em preparação/);
  assert.match(portal, /disabled/);
});
