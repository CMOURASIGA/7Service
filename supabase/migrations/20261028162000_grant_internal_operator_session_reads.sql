GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.internal_users, public.internal_user_roles, public.internal_roles, public.internal_role_permissions, public.internal_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_internal_operator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_internal_permission(text) TO authenticated;
