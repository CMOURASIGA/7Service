-- Dados determinísticos para os testes de RLS/multi-tenant/IDOR
-- (tests/integration/rls.test.ts). IDs fixos de propósito para que o
-- teste possa referenciá-los diretamente sem round-trip.

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'super.admin@consultservices.com.br'),
  ('10000000-0000-0000-0000-000000000002', 'support@consultservices.com.br'),
  ('10000000-0000-0000-0000-000000000003', 'blocked.operator@consultservices.com.br'),
  ('a1000000-0000-0000-0000-000000000001', 'user.a@clientea.example.com'),
  ('b1000000-0000-0000-0000-000000000001', 'user.b@clienteb.example.com');

-- Operadores internos
insert into public.internal_users (id, auth_user_id, first_name, last_name, email, status) values
  ('10000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001', 'Super', 'Admin', 'super.admin@consultservices.com.br', 'ACTIVE'),
  ('10000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-000000000002', 'Suporte', 'Operador', 'support@consultservices.com.br', 'ACTIVE'),
  ('10000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-000000000003', 'Bloqueado', 'Operador', 'blocked.operator@consultservices.com.br', 'BLOCKED');

insert into public.internal_user_roles (internal_user_id, role_id)
select '10000000-0000-0000-0000-0000000000a1', id from public.internal_roles where code = 'SUPER_ADMIN';

insert into public.internal_user_roles (internal_user_id, role_id)
select '10000000-0000-0000-0000-0000000000a2', id from public.internal_roles where code = 'SUPPORT';

insert into public.internal_user_roles (internal_user_id, role_id)
select '10000000-0000-0000-0000-0000000000a3', id from public.internal_roles where code = 'SUPER_ADMIN';

-- Clientes (tenants) A e B
insert into public.clients (id, person_type, document, legal_name, status) values
  ('a0000000-0000-0000-0000-00000000000a', 'PJ', '11111111000191', 'Cliente A Ltda', 'ACTIVE'),
  ('b0000000-0000-0000-0000-00000000000b', 'PJ', '22222222000192', 'Cliente B Ltda', 'ACTIVE');

-- Produto + role
insert into public.products (id, code, name, status) values
  ('c0000000-0000-0000-0000-000000000001', 'TEST_PRODUCT', 'Produto de Teste', 'ACTIVE');

insert into public.product_roles (id, product_id, code, name) values
  ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'MEMBER', 'Membro');

-- Contratos
insert into public.contracts (id, client_id, reference, start_date, status) values
  ('ca000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'CTR-A-0001', current_date - 100, 'ACTIVE'),
  ('cb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-00000000000b', 'CTR-B-0001', current_date - 100, 'ACTIVE');

-- Assinaturas: A ativa (limite 1), A bloqueada (venceu há muito, sem carência), B ativa
insert into public.subscriptions (id, client_id, contract_id, product_id, start_date, end_date, grace_days, license_limit, status) values
  ('da000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'ca000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', current_date - 90, current_date + 30, 5, 1, 'ACTIVE'),
  ('da000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'ca000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', current_date - 90, current_date - 30, 0, 5, 'ACTIVE'),
  ('db000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-00000000000b', 'cb000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', current_date - 90, current_date + 30, 5, 5, 'ACTIVE');

-- Identidades (usuários finais) de cada cliente
insert into public.identities (id, auth_user_id, client_id, first_name, last_name, email, status) values
  ('ea000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'Usuário', 'A', 'user.a@clientea.example.com', 'ACTIVE'),
  ('eb000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-00000000000b', 'Usuário', 'B', 'user.b@clienteb.example.com', 'ACTIVE');

-- Acessos concedidos, um por cliente, à assinatura ativa
insert into public.user_product_access (id, identity_id, subscription_id, product_role_id, status) values
  ('fa000000-0000-0000-0000-000000000001', 'ea000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'ACTIVE'),
  ('fb000000-0000-0000-0000-000000000001', 'eb000000-0000-0000-0000-000000000001', 'db000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'ACTIVE');
