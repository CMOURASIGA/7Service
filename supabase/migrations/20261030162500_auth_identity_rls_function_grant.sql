-- HV-05 / HV-04: authenticated operator's product list evaluates products_select
-- (is_internal_operator() OR current_identity_client_id() IS NOT NULL).
-- PostgREST runs the browser-authenticated SELECT with the authenticated SQL role,
-- not the service_role used by privileged internal API routes.
-- current_identity_client_id() is SECURITY DEFINER, with no arguments, and derives
-- its result only from auth.uid(). The authenticated role needs EXECUTE to evaluate
-- the existing RLS policy. Preserve all RLS policies and keep anon without EXECUTE.
GRANT EXECUTE ON FUNCTION public.current_identity_client_id() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.current_identity_client_id() FROM anon;
