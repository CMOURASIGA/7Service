-- 7Service - Catálogo de Produtos (Etapa 4)
--
-- Referência: docs/03-domains/PRODUCTS.md
--
-- Regra essencial: nenhuma lógica comum do 7Service depende de código
-- específico para os produtos atuais. O catálogo é a única fonte de
-- verdade sobre quais produtos, roles, módulos e features existem.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE')),
  entry_url text,
  login_url text,
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_roles (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  unique (product_id, code)
);

create table public.product_modules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  unique (product_id, code)
);

create table public.product_features (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  module_id uuid references public.product_modules (id) on delete set null,
  code text not null,
  name text not null,
  description text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  unique (product_id, code)
);

-- RLS: catálogo é legível por qualquer operador interno autenticado
-- (necessário para telas de contrato/acesso) e por identidades de cliente
-- (para montar a experiência de produtos contratados). Escrita restrita a
-- products.manage.
alter table public.products enable row level security;
alter table public.product_roles enable row level security;
alter table public.product_modules enable row level security;
alter table public.product_features enable row level security;

create policy "products_select" on public.products
  for select using (public.is_internal_operator() or public.current_identity_client_id() is not null);
create policy "products_write" on public.products
  for all using (public.has_internal_permission('products.manage'))
  with check (public.has_internal_permission('products.manage'));

create policy "product_roles_select" on public.product_roles
  for select using (public.is_internal_operator() or public.current_identity_client_id() is not null);
create policy "product_roles_write" on public.product_roles
  for all using (public.has_internal_permission('products.manage'))
  with check (public.has_internal_permission('products.manage'));

create policy "product_modules_select" on public.product_modules
  for select using (public.is_internal_operator() or public.current_identity_client_id() is not null);
create policy "product_modules_write" on public.product_modules
  for all using (public.has_internal_permission('products.manage'))
  with check (public.has_internal_permission('products.manage'));

create policy "product_features_select" on public.product_features
  for select using (public.is_internal_operator() or public.current_identity_client_id() is not null);
create policy "product_features_write" on public.product_features
  for all using (public.has_internal_permission('products.manage'))
  with check (public.has_internal_permission('products.manage'));
