-- 7Service: contract PDF metadata in a private, non-publicly writable registry.
-- Apply only after review and explicit authorization. This commit does not execute SQL.
create table if not exists public.contract_files (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete restrict,
  storage_path text not null unique,
  constraint contract_files_contract_path_unique unique (contract_id, storage_path),
  original_name text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  signed_document boolean not null default false,
  uploaded_by uuid not null references public.internal_users(id),
  uploaded_at timestamptz not null default now(),
  constraint contract_files_pdf_type check (mime_type = 'application/pdf'),
  constraint contract_files_path_format check (
    storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.]pdf$'
  )
);
create index if not exists contract_files_contract_id_idx on public.contract_files(contract_id);
alter table public.contract_files enable row level security;
revoke all on public.contract_files from public, anon, authenticated;
grant select, insert on public.contract_files to service_role;
-- No policies for anon/authenticated. Privileged writes require server-side RBAC.
