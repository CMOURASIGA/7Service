-- 7Service - Identidade administrativa e RBAC interno (Etapa 1)
--
-- Referência: docs/01-architecture/AUTHORIZATION.md, docs/03-domains/USERS.md
-- (seção "Tela administrativa interna"), docs/SPEC_STATUS.md (seção 4).
--
-- Perfis internos previstos: SUPER_ADMIN, OPERATIONS_ADMIN, SUPPORT,
-- COMMERCIAL, FINANCE, AUDITOR. Somente SUPER_ADMIN precisa estar
-- operacional na primeira entrega, mas o modelo nasce pronto para os
-- demais (seed abaixo).

create table public.internal_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.internal_permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.internal_role_permissions (
  role_id uuid not null references public.internal_roles (id) on delete cascade,
  permission_id uuid not null references public.internal_permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Perfil administrativo interno da Consult Services. Distinto de
-- `identities` (usuários finais dos clientes) por escopo: um operador
-- interno não pertence a um client_id de negócio.
create table public.internal_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete restrict,
  first_name text not null,
  last_name text not null,
  email text not null,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'BLOCKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.internal_users
  for each row execute function public.set_updated_at();

create table public.internal_user_roles (
  internal_user_id uuid not null references public.internal_users (id) on delete cascade,
  role_id uuid not null references public.internal_roles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.internal_users (id),
  primary key (internal_user_id, role_id)
);

-- Seed dos perfis e permissões previstos (docs/SPEC_STATUS.md seção 4).
-- A matriz fina pode evoluir; SUPER_ADMIN recebe todas as permissions
-- cadastradas para garantir operação completa desde a primeira entrega.
insert into public.internal_roles (code, name, description) values
  ('SUPER_ADMIN', 'Super Administrador', 'Acesso administrativo completo ao 7Service'),
  ('OPERATIONS_ADMIN', 'Administrador de Operações', 'Administra clientes, produtos, contratos e acessos'),
  ('SUPPORT', 'Suporte', 'Consulta usuários/clientes, reenvia convite e inicia recuperação'),
  ('COMMERCIAL', 'Comercial', 'Administra contratos e assinaturas'),
  ('FINANCE', 'Financeiro', 'Consulta dados comerciais e licenciamento'),
  ('AUDITOR', 'Auditor', 'Acesso somente leitura à auditoria e aos domínios administrativos');

insert into public.internal_permissions (code, description) values
  ('clients.manage', 'Criar, editar, suspender e reativar clientes'),
  ('clients.view', 'Consultar clientes'),
  ('products.manage', 'Administrar catálogo de produtos'),
  ('contracts.manage', 'Administrar contratos e assinaturas'),
  ('licenses.override', 'Autorizar exceção de limite de licença'),
  ('users.manage', 'Criar e administrar usuários finais'),
  ('users.access.manage', 'Conceder, alterar e suspender acesso por produto'),
  ('invitations.manage', 'Reenviar/cancelar convites'),
  ('recovery.initiate', 'Iniciar recuperação de acesso de usuário'),
  ('audit.view', 'Consultar auditoria'),
  ('internal_users.manage', 'Cadastrar e administrar operadores internos e RBAC');

insert into public.internal_role_permissions (role_id, permission_id)
select r.id, p.id
from public.internal_roles r
cross join public.internal_permissions p
where r.code = 'SUPER_ADMIN';

insert into public.internal_role_permissions (role_id, permission_id)
select r.id, p.id
from public.internal_roles r
join public.internal_permissions p
  on p.code in ('clients.manage', 'clients.view', 'products.manage', 'contracts.manage',
                'users.manage', 'users.access.manage', 'invitations.manage', 'recovery.initiate',
                'audit.view')
where r.code = 'OPERATIONS_ADMIN';

insert into public.internal_role_permissions (role_id, permission_id)
select r.id, p.id
from public.internal_roles r
join public.internal_permissions p
  on p.code in ('clients.view', 'invitations.manage', 'recovery.initiate')
where r.code = 'SUPPORT';

insert into public.internal_role_permissions (role_id, permission_id)
select r.id, p.id
from public.internal_roles r
join public.internal_permissions p
  on p.code in ('clients.view', 'contracts.manage')
where r.code = 'COMMERCIAL';

insert into public.internal_role_permissions (role_id, permission_id)
select r.id, p.id
from public.internal_roles r
join public.internal_permissions p
  on p.code in ('clients.view', 'contracts.manage', 'audit.view')
where r.code = 'FINANCE';

insert into public.internal_role_permissions (role_id, permission_id)
select r.id, p.id
from public.internal_roles r
join public.internal_permissions p
  on p.code in ('clients.view', 'audit.view')
where r.code = 'AUDITOR';

-- RLS
alter table public.internal_roles enable row level security;
alter table public.internal_permissions enable row level security;
alter table public.internal_role_permissions enable row level security;
alter table public.internal_users enable row level security;
alter table public.internal_user_roles enable row level security;

-- Catálogo de roles/permissions: leitura liberada a qualquer operador
-- interno ativo, escrita restrita a quem tem internal_users.manage.
create policy "internal_roles_select" on public.internal_roles
  for select using (public.is_internal_operator());
create policy "internal_roles_write" on public.internal_roles
  for all using (public.has_internal_permission('internal_users.manage'))
  with check (public.has_internal_permission('internal_users.manage'));

create policy "internal_permissions_select" on public.internal_permissions
  for select using (public.is_internal_operator());
create policy "internal_permissions_write" on public.internal_permissions
  for all using (public.has_internal_permission('internal_users.manage'))
  with check (public.has_internal_permission('internal_users.manage'));

create policy "internal_role_permissions_select" on public.internal_role_permissions
  for select using (public.is_internal_operator());
create policy "internal_role_permissions_write" on public.internal_role_permissions
  for all using (public.has_internal_permission('internal_users.manage'))
  with check (public.has_internal_permission('internal_users.manage'));

-- internal_users: um operador sempre pode ler o próprio registro; leitura
-- ampla e escrita exigem permissão de gestão de operadores internos.
create policy "internal_users_select_self" on public.internal_users
  for select using (auth_user_id = auth.uid());
create policy "internal_users_select_managers" on public.internal_users
  for select using (public.has_internal_permission('internal_users.manage'));
create policy "internal_users_write" on public.internal_users
  for all using (public.has_internal_permission('internal_users.manage'))
  with check (public.has_internal_permission('internal_users.manage'));

create policy "internal_user_roles_select_self" on public.internal_user_roles
  for select using (
    internal_user_id in (select id from public.internal_users where auth_user_id = auth.uid())
  );
create policy "internal_user_roles_select_managers" on public.internal_user_roles
  for select using (public.has_internal_permission('internal_users.manage'));
create policy "internal_user_roles_write" on public.internal_user_roles
  for all using (public.has_internal_permission('internal_users.manage'))
  with check (public.has_internal_permission('internal_users.manage'));
