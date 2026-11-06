-- HV-05: privileged backend cannot execute identity resolver referenced by existing RLS policies.
-- Do not grant to anon or authenticated. Execute only with explicit database authorization.
grant execute on function public.current_identity_client_id() to service_role;
