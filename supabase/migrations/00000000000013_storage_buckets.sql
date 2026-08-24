-- 7Service - Buckets de Storage privados
--
-- Referência: docs/01-architecture/DATABASE_RELATIONSHIPS.md ("Storage"),
-- docs/01-architecture/SECURITY.md
--
-- Todos os buckets são privados; acesso a arquivo individual é sempre via
-- URL assinada temporária gerada pelo backend, nunca por URL pública.

insert into storage.buckets (id, name, public)
values
  ('contract-documents', 'contract-documents', false),
  ('client-exports', 'client-exports', false),
  ('product-assets', 'product-assets', false),
  ('client-assets', 'client-assets', false)
on conflict (id) do nothing;

create policy "contract_documents_internal_read" on storage.objects
  for select using (
    bucket_id = 'contract-documents' and public.has_internal_permission('clients.view')
  );
create policy "contract_documents_internal_write" on storage.objects
  for insert with check (
    bucket_id = 'contract-documents' and public.has_internal_permission('contracts.manage')
  );
create policy "contract_documents_internal_delete" on storage.objects
  for delete using (
    bucket_id = 'contract-documents' and public.has_internal_permission('contracts.manage')
  );

create policy "client_exports_internal_read" on storage.objects
  for select using (
    bucket_id = 'client-exports' and public.has_internal_permission('clients.manage')
  );
create policy "client_exports_internal_write" on storage.objects
  for insert with check (
    bucket_id = 'client-exports' and public.has_internal_permission('clients.manage')
  );

create policy "product_assets_read" on storage.objects
  for select using (
    bucket_id = 'product-assets'
    and (public.is_internal_operator() or public.current_identity_client_id() is not null)
  );
create policy "product_assets_write" on storage.objects
  for insert with check (
    bucket_id = 'product-assets' and public.has_internal_permission('products.manage')
  );

create policy "client_assets_internal_read" on storage.objects
  for select using (
    bucket_id = 'client-assets' and public.has_internal_permission('clients.view')
  );
create policy "client_assets_internal_write" on storage.objects
  for insert with check (
    bucket_id = 'client-assets' and public.has_internal_permission('clients.manage')
  );
