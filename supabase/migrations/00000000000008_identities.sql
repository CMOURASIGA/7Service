-- 7Service - Identidades (usuários finais dos clientes) (Etapa 7)
--
-- Referência: docs/03-domains/USERS.md, docs/01-architecture/DATABASE_RELATIONSHIPS.md
--
-- Decisão de arquitetura: cada identidade possui exatamente um client_id
-- (1 usuário : 1 cliente). auth_user_id é opcional até a ativação via
-- convite (docs/03-domains/INVITATIONS.md) — antes disso a identidade
-- existe apenas como registro administrativo PENDING_INVITE.

create table public.identities (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  client_id uuid not null references public.clients (id) on delete restrict,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  job_title text,
  status text not null default 'PENDING_INVITE'
    check (status in (
      'PENDING_INVITE', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'INVITE_EXPIRED', 'REMOVED'
    )),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.identities
  for each row execute function public.set_updated_at();

-- E-mail não é chave relacional, mas deve ser único entre identidades
-- operacionalmente ativas para evitar ambiguidade de convite/login
-- (docs/03-domains/USERS.md, docs/01-architecture/DATABASE_RELATIONSHIPS.md).
create unique index identities_email_active_key
  on public.identities (lower(email))
  where status not in ('REMOVED', 'INVITE_EXPIRED');

alter table public.identities enable row level security;

create policy "identities_select_internal" on public.identities
  for select using (public.has_internal_permission('clients.view'));
create policy "identities_select_self" on public.identities
  for select using (auth_user_id = auth.uid());
create policy "identities_write" on public.identities
  for all using (public.has_internal_permission('users.manage'))
  with check (public.has_internal_permission('users.manage'));
