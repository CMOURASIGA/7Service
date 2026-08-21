-- 7Service - Domínio de Clientes (Etapa 3)
--
-- Referência: docs/03-domains/CLIENTS.md, docs/01-architecture/DATABASE_RELATIONSHIPS.md

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  person_type text not null check (person_type in ('PF', 'PJ')),
  document text not null,
  legal_name text not null,
  trade_name text,
  phone text,
  email text,
  contact_name text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'SUSPENDED', 'CLOSED')),
  notes text,
  relationship_start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documento único apenas entre clientes não encerrados, para permitir
-- reaproveitamento de CPF/CNPJ após encerramento formal sem violar unicidade
-- (docs/03-domains/CLIENTS.md).
create unique index clients_document_active_key
  on public.clients (document)
  where status <> 'CLOSED';

create trigger set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create table public.client_addresses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  postal_code text,
  street text,
  number text,
  complement text,
  district text,
  city text,
  state text,
  country text not null default 'BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.client_addresses
  for each row execute function public.set_updated_at();

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.client_contacts
  for each row execute function public.set_updated_at();

-- RLS: domínio exclusivamente administrativo interno. Usuários finais de
-- clientes não acessam esta tabela diretamente.
alter table public.clients enable row level security;
alter table public.client_addresses enable row level security;
alter table public.client_contacts enable row level security;

create policy "clients_select" on public.clients
  for select using (public.has_internal_permission('clients.view'));
create policy "clients_write" on public.clients
  for all using (public.has_internal_permission('clients.manage'))
  with check (public.has_internal_permission('clients.manage'));

create policy "client_addresses_select" on public.client_addresses
  for select using (public.has_internal_permission('clients.view'));
create policy "client_addresses_write" on public.client_addresses
  for all using (public.has_internal_permission('clients.manage'))
  with check (public.has_internal_permission('clients.manage'));

create policy "client_contacts_select" on public.client_contacts
  for select using (public.has_internal_permission('clients.view'));
create policy "client_contacts_write" on public.client_contacts
  for all using (public.has_internal_permission('clients.manage'))
  with check (public.has_internal_permission('clients.manage'));
