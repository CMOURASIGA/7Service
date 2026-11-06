-- 7Service - Planos comerciais reutilizáveis
--
-- Referência: docs/01-architecture/DATABASE.md ("plans")

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, code)
);

create trigger set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- Módulos/features padrão concedidos por um plano (docs/01-architecture/LICENSING.md
-- - "Plano pode conceder módulos/features por padrão").
create table public.plan_modules (
  plan_id uuid not null references public.plans (id) on delete cascade,
  module_id uuid not null references public.product_modules (id) on delete cascade,
  primary key (plan_id, module_id)
);

create table public.plan_features (
  plan_id uuid not null references public.plans (id) on delete cascade,
  feature_id uuid not null references public.product_features (id) on delete cascade,
  primary key (plan_id, feature_id)
);

alter table public.plans enable row level security;
alter table public.plan_modules enable row level security;
alter table public.plan_features enable row level security;

create policy "plans_select" on public.plans
  for select using (public.is_internal_operator());
create policy "plans_write" on public.plans
  for all using (public.has_internal_permission('products.manage'))
  with check (public.has_internal_permission('products.manage'));

create policy "plan_modules_select" on public.plan_modules
  for select using (public.is_internal_operator());
create policy "plan_modules_write" on public.plan_modules
  for all using (public.has_internal_permission('products.manage'))
  with check (public.has_internal_permission('products.manage'));

create policy "plan_features_select" on public.plan_features
  for select using (public.is_internal_operator());
create policy "plan_features_write" on public.plan_features
  for all using (public.has_internal_permission('products.manage'))
  with check (public.has_internal_permission('products.manage'));
