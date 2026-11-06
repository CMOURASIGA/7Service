-- Privilégios SQL mínimos para a rotina de bootstrap executada exclusivamente
-- pelo service_role. RLS continua habilitado; não há concessão a anon ou
-- authenticated.

GRANT SELECT, INSERT ON TABLE public.internal_users TO service_role;
GRANT SELECT, INSERT ON TABLE public.internal_user_roles TO service_role;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO service_role;
GRANT SELECT ON TABLE public.internal_roles TO service_role;
