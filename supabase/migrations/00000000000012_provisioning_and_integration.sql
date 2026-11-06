-- 7Service - Provisionamento e Outbox de Integração (fundação para Onda 1)
--
-- Referência: docs/01-architecture/PROVISIONING.md, docs/01-architecture/ARCHITECTURE.md
--
-- Tabelas preparadas desde a Fase 1 para suportar a migração progressiva
-- dos produtos (Onda 1: 7Commander + CRM Flow), sem uso funcional
-- obrigatório antes disso (docs/SPEC_STATUS.md - regra 8).

create table public.provisioning_jobs (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  target_system text not null,
  job_type text not null,
  payload jsonb not null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'RETRYING', 'DEAD_LETTER')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.provisioning_jobs
  for each row execute function public.set_updated_at();

create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique default gen_random_uuid(),
  event_type text not null,
  schema_version integer not null default 1,
  occurred_at timestamptz not null default now(),
  correlation_id uuid,
  actor_context jsonb,
  payload jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index integration_events_event_type_idx on public.integration_events (event_type);
create index integration_events_published_at_idx on public.integration_events (published_at);

alter table public.provisioning_jobs enable row level security;
alter table public.integration_events enable row level security;

-- Domínio técnico de backend: sem policy para roles autenticadas comuns.
-- Acesso apenas via service role (jobs/edge functions).
create policy "provisioning_jobs_select_internal" on public.provisioning_jobs
  for select using (public.has_internal_permission('audit.view'));

create policy "integration_events_select_internal" on public.integration_events
  for select using (public.has_internal_permission('audit.view'));
