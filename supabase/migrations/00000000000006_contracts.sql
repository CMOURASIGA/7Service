-- 7Service - Domínio de Contratos (Etapa 5)
--
-- Referência: docs/03-domains/CONTRACTS.md

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  reference text not null,
  start_date date not null,
  end_date date,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CLOSED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, reference)
);

create trigger set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

-- Metadados de arquivo. O binário do PDF vive no bucket privado
-- `contract-documents` do Supabase Storage; aqui só o caminho seguro
-- (docs/03-domains/CONTRACTS.md - "Armazenamento do PDF").
create table public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  signed_document boolean not null default true,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references public.internal_users (id)
);

alter table public.contracts enable row level security;
alter table public.contract_documents enable row level security;

create policy "contracts_select" on public.contracts
  for select using (public.has_internal_permission('clients.view'));
create policy "contracts_write" on public.contracts
  for all using (public.has_internal_permission('contracts.manage'))
  with check (public.has_internal_permission('contracts.manage'));

create policy "contract_documents_select" on public.contract_documents
  for select using (public.has_internal_permission('clients.view'));
create policy "contract_documents_write" on public.contract_documents
  for all using (public.has_internal_permission('contracts.manage'))
  with check (public.has_internal_permission('contracts.manage'));
