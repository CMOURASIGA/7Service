-- Client to external tenant mapping for 7Commander and 7Clinic.
-- Source of truth for commercial linkage; never infer tenancy from the caller's clientId.
-- Apply only with explicit central Supabase change authorization.
create table if not exists public.client_integration_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  product_code text not null check (product_code in ('7COMMANDER','7CLINIC')),
  external_tenant_id text not null check (length(trim(external_tenant_id)) between 1 and 200),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, product_code),
  unique (product_code, external_tenant_id)
);
alter table public.client_integration_links enable row level security;
revoke all on public.client_integration_links from public, anon, authenticated;
grant select, insert, update on public.client_integration_links to service_role;
create index if not exists client_integration_links_client_idx on public.client_integration_links(client_id);
