-- 7Service - Acesso por produto e Entitlements (Etapa 8)
--
-- Referência: docs/03-domains/ENTITLEMENTS.md, docs/01-architecture/ACCESS_DECISION.md
--
-- Entidade central de autorização: aponta para a subscription (não
-- diretamente para o produto), permitindo validar contrato, vigência,
-- carência, limite e plano em uma única junção
-- (docs/01-architecture/DATABASE_RELATIONSHIPS.md - "Decisão 2").

create table public.user_product_access (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.identities (id) on delete restrict,
  subscription_id uuid not null references public.subscriptions (id) on delete restrict,
  product_role_id uuid not null references public.product_roles (id) on delete restrict,
  status text not null default 'ACTIVE'
    check (status in ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED')),
  valid_from date not null default current_date,
  valid_until date,
  suspended_at timestamptz,
  suspended_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identity_id, subscription_id)
);

create trigger set_updated_at
  before update on public.user_product_access
  for each row execute function public.set_updated_at();

-- Exceções de módulo/feature concedidas a este acesso específico, além do
-- que a subscription já libera (docs/03-domains/ENTITLEMENTS.md).
create table public.user_access_modules (
  user_product_access_id uuid not null references public.user_product_access (id) on delete cascade,
  module_id uuid not null references public.product_modules (id) on delete cascade,
  primary key (user_product_access_id, module_id)
);

create table public.user_access_features (
  user_product_access_id uuid not null references public.user_product_access (id) on delete cascade,
  feature_id uuid not null references public.product_features (id) on delete cascade,
  primary key (user_product_access_id, feature_id)
);

-- Exceções administrativas de limite de licença (override), sempre com
-- motivo e responsável — nunca implícitas (docs/03-domains/LICENSES.md,
-- docs/01-architecture/LICENSING.md).
create table public.license_overrides (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  granted_by uuid not null references public.internal_users (id),
  reason text not null,
  extra_licenses integer not null check (extra_licenses > 0),
  created_at timestamptz not null default now()
);

-- Consulta única e central de consumo de licença: quantidade de acessos
-- que contam contra o limite de uma subscription (PENDING e ACTIVE
-- consomem; SUSPENDED/REVOKED/EXPIRED não). Evita cálculo duplicado entre
-- telas e serviços (docs/01-architecture/DATABASE_RELATIONSHIPS.md -
-- "Regra de licença").
create or replace function public.subscription_license_usage(p_subscription_id uuid)
returns table (
  license_limit integer,
  extra_licenses integer,
  used integer,
  available integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.license_limit,
    coalesce(sum(lo.extra_licenses), 0)::integer as extra_licenses,
    (
      select count(*)::integer
      from public.user_product_access upa
      where upa.subscription_id = s.id
        and upa.status in ('PENDING', 'ACTIVE')
    ) as used,
    (s.license_limit + coalesce(sum(lo.extra_licenses), 0)) - (
      select count(*)::integer
      from public.user_product_access upa
      where upa.subscription_id = s.id
        and upa.status in ('PENDING', 'ACTIVE')
    ) as available
  from public.subscriptions s
  left join public.license_overrides lo on lo.subscription_id = s.id
  where s.id = p_subscription_id
  group by s.id, s.license_limit;
$$;

alter table public.user_product_access enable row level security;
alter table public.user_access_modules enable row level security;
alter table public.user_access_features enable row level security;
alter table public.license_overrides enable row level security;

create policy "user_product_access_select_internal" on public.user_product_access
  for select using (public.has_internal_permission('clients.view'));
create policy "user_product_access_select_self" on public.user_product_access
  for select using (
    identity_id in (select id from public.identities where auth_user_id = auth.uid())
  );
create policy "user_product_access_write" on public.user_product_access
  for all using (public.has_internal_permission('users.access.manage'))
  with check (public.has_internal_permission('users.access.manage'));

create policy "user_access_modules_select" on public.user_access_modules
  for select using (public.has_internal_permission('clients.view'));
create policy "user_access_modules_write" on public.user_access_modules
  for all using (public.has_internal_permission('users.access.manage'))
  with check (public.has_internal_permission('users.access.manage'));

create policy "user_access_features_select" on public.user_access_features
  for select using (public.has_internal_permission('clients.view'));
create policy "user_access_features_write" on public.user_access_features
  for all using (public.has_internal_permission('users.access.manage'))
  with check (public.has_internal_permission('users.access.manage'));

create policy "license_overrides_select" on public.license_overrides
  for select using (public.has_internal_permission('clients.view'));
create policy "license_overrides_write" on public.license_overrides
  for all using (public.has_internal_permission('licenses.override'))
  with check (public.has_internal_permission('licenses.override'));
