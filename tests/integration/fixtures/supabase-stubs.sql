-- Stub do ambiente Supabase para testar RLS localmente contra Postgres
-- puro. Reproduz o suficiente da plataforma real para validar as
-- policies com a MESMA engine (Postgres RLS) que o Supabase usa:
--
--   - auth.uid() lendo de uma GUC de sessão (equivalente ao JWT decodado
--     que o PostgREST injeta em cada requisição real);
--   - os papéis nativos do Supabase (anon/authenticated/service_role),
--     com service_role em BYPASSRLS (mesmo comportamento da chave
--     administrativa real);
--   - um login role dedicado (test_runner) que os testes usam para
--     alternar de papel via SET ROLE, sem herdar privilégio de superuser.
--
-- O que isto NÃO reproduz: a camada PostgREST (parsing de query string,
-- geração de JWT real pelo GoTrue) e o Storage real (apenas as tabelas
-- storage.buckets/objects). Ver docs/TESTING.md para o que ainda depende
-- do projeto Supabase real.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text
);

alter table storage.objects enable row level security;

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select from pg_roles where rolname = 'test_runner') then
    create role test_runner login password 'test_runner_pw' noinherit;
  end if;
end $$;

grant anon, authenticated, service_role to test_runner;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
