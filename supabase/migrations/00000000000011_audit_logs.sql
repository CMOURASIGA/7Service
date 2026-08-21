-- 7Service - Auditoria (Etapa 12)
--
-- Referência: docs/01-architecture/AUDIT.md
--
-- Trilha imutável: nenhuma policy de UPDATE/DELETE é criada, inclusive
-- para SUPER_ADMIN (docs/01-architecture/AUDIT.md - "usuário comum não
-- altera audit log"; docs/SPEC_STATUS.md - "auditoria não pode ser apagada
-- pela UI, inclusive por SUPER_ADMIN"). Escrita apenas via INSERT,
-- preferencialmente por funções SECURITY DEFINER chamadas pelos services.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_identity_id uuid references public.identities (id),
  actor_internal_user_id uuid references public.internal_users (id),
  action text not null,
  target_type text not null,
  target_id uuid,
  client_id uuid references public.clients (id),
  product_id uuid references public.products (id),
  before_json jsonb,
  after_json jsonb,
  reason text,
  correlation_id uuid not null default gen_random_uuid(),
  source text not null default 'app',
  metadata_safe jsonb
);

create index audit_logs_occurred_at_idx on public.audit_logs (occurred_at desc);
create index audit_logs_client_id_idx on public.audit_logs (client_id);
create index audit_logs_target_idx on public.audit_logs (target_type, target_id);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select" on public.audit_logs
  for select using (public.has_internal_permission('audit.view'));

-- Apenas o backend (service role) grava eventos de auditoria diretamente;
-- não há policy de INSERT para roles autenticadas comuns.
