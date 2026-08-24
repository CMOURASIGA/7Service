-- Aplicado depois das migrations (as tabelas precisam existir). Espelha os
-- grants padrão que o Supabase aplica automaticamente aos papéis
-- anon/authenticated/service_role.

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant select, insert on storage.objects to authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
