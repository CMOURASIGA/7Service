-- 7Service - Assinaturas por produto (Etapa 5/6)
--
-- Referência: docs/03-domains/LICENSES.md, docs/01-architecture/ACCESS_DECISION.md
--
-- Cada produto contratado por um cliente possui sua própria assinatura,
-- vigência, grace period e limite de licenças, independente dos demais
-- produtos do mesmo cliente.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  contract_id uuid not null references public.contracts (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  plan_id uuid references public.plans (id) on delete set null,
  start_date date not null,
  end_date date,
  grace_days integer not null default 5,
  monthly_value numeric(12, 2),
  implementation_value numeric(12, 2),
  license_limit integer not null check (license_limit >= 0),
  status text not null default 'ACTIVE'
    check (status in ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Módulos/features excepcionalmente concedidos por esta assinatura além do
-- que o plano padrão já concede (docs/01-architecture/LICENSING.md -
-- "contrato pode adicionar exceções explicitamente registradas").
create table public.subscription_modules (
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  module_id uuid not null references public.product_modules (id) on delete cascade,
  primary key (subscription_id, module_id)
);

create table public.subscription_features (
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  feature_id uuid not null references public.product_features (id) on delete cascade,
  primary key (subscription_id, feature_id)
);

-- Estado comercial EFETIVO da assinatura na data atual, considerando
-- grace period. É a função que toda decisão de acesso deve consultar
-- (docs/01-architecture/ACCESS_DECISION.md, docs/03-domains/LICENSES.md).
--
--   ACTIVE       -> dentro da vigência, ou sem end_date definido
--   GRACE_PERIOD -> entre end_date e end_date + grace_days
--   BLOCKED      -> após o fim do grace period
--   SUSPENDED / CANCELLED / DRAFT -> refletem o status administrativo bruto
create or replace function public.subscription_effective_status(sub public.subscriptions)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when sub.status in ('SUSPENDED', 'CANCELLED', 'DRAFT') then sub.status
    when sub.end_date is null then 'ACTIVE'
    when current_date <= sub.end_date then 'ACTIVE'
    when current_date <= sub.end_date + sub.grace_days then 'GRACE_PERIOD'
    else 'BLOCKED'
  end;
$$;

alter table public.subscriptions enable row level security;
alter table public.subscription_modules enable row level security;
alter table public.subscription_features enable row level security;

create policy "subscriptions_select" on public.subscriptions
  for select using (
    public.has_internal_permission('clients.view')
    or client_id = public.current_identity_client_id()
  );
create policy "subscriptions_write" on public.subscriptions
  for all using (public.has_internal_permission('contracts.manage'))
  with check (public.has_internal_permission('contracts.manage'));

create policy "subscription_modules_select" on public.subscription_modules
  for select using (public.has_internal_permission('clients.view'));
create policy "subscription_modules_write" on public.subscription_modules
  for all using (public.has_internal_permission('contracts.manage'))
  with check (public.has_internal_permission('contracts.manage'));

create policy "subscription_features_select" on public.subscription_features
  for select using (public.has_internal_permission('clients.view'));
create policy "subscription_features_write" on public.subscription_features
  for all using (public.has_internal_permission('contracts.manage'))
  with check (public.has_internal_permission('contracts.manage'));
