-- 7Service - Funções auxiliares compartilhadas
--
-- Funções em `plpgsql` têm o corpo validado apenas na primeira execução,
-- não na criação — por isso podem referenciar tabelas que só existem em
-- migrations posteriores (internal_users, internal_user_roles,
-- identities). Isso permite declarar aqui, uma única vez, os helpers de
-- autorização usados pelas policies de RLS de todas as migrations
-- seguintes.

-- Atualiza updated_at automaticamente em qualquer tabela que use o trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Verdadeiro quando o usuário autenticado é um operador interno ATIVE
-- (docs/01-architecture/AUTHORIZATION.md - "Administração do 7Service").
create or replace function public.is_internal_operator()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.internal_users iu
    where iu.auth_user_id = auth.uid()
      and iu.status = 'ACTIVE'
  );
end;
$$;

-- Verdadeiro quando o operador interno autenticado possui a permission_code
-- informada em algum papel ativo (RBAC interno).
create or replace function public.has_internal_permission(permission_code text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.internal_user_roles iur
    join public.internal_role_permissions irp on irp.role_id = iur.role_id
    join public.internal_permissions ip on ip.id = irp.permission_id
    join public.internal_users iu on iu.id = iur.internal_user_id
    where iu.auth_user_id = auth.uid()
      and iu.status = 'ACTIVE'
      and ip.code = permission_code
  );
end;
$$;

-- client_id da identidade de cliente autenticada (usuário final de um
-- cliente da Consult Services), usado para isolar dados por tenant.
create or replace function public.current_identity_client_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
begin
  select i.client_id into v_client_id
  from public.identities i
  where i.auth_user_id = auth.uid()
    and i.status <> 'REMOVED'
  limit 1;

  return v_client_id;
end;
$$;
