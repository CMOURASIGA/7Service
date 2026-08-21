-- 7Service - Convites (Etapa 9)
--
-- Referência: docs/03-domains/INVITATIONS.md
--
-- Token nunca é armazenado em texto puro: apenas o hash. Validade de 24h
-- é aplicada em código de aplicação (expires_at) e revalidada no momento
-- da ativação.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.identities (id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'SENT', 'ACCEPTED', 'EXPIRED', 'CANCELLED', 'FAILED')),
  expires_at timestamptz not null,
  sent_at timestamptz,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references public.internal_users (id),
  created_at timestamptz not null default now()
);

create index invitations_identity_id_idx on public.invitations (identity_id);

alter table public.invitations enable row level security;

create policy "invitations_select_internal" on public.invitations
  for select using (public.has_internal_permission('clients.view'));
create policy "invitations_write" on public.invitations
  for all using (public.has_internal_permission('invitations.manage'))
  with check (public.has_internal_permission('invitations.manage'));
