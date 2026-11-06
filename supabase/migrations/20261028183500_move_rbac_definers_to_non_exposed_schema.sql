CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_internal_permission(permission_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_user_roles iur
    JOIN public.internal_role_permissions rp ON rp.role_id=iur.role_id
    JOIN public.internal_permissions ip ON ip.id=rp.permission_id
    JOIN public.internal_users u ON u.id=iur.internal_user_id
    WHERE u.auth_user_id=(SELECT auth.uid())
      AND u.status='ACTIVE' AND ip.code=permission_code
  );
$$;
CREATE OR REPLACE FUNCTION private.is_internal_operator()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_users u
    WHERE u.auth_user_id=(SELECT auth.uid()) AND u.status='ACTIVE'
  );
$$;
REVOKE ALL ON FUNCTION private.has_internal_permission(text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.is_internal_operator() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.has_internal_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_internal_operator() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_internal_permission(permission_code text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RETURN false; END IF;
 RETURN private.has_internal_permission(permission_code);
END $$;
CREATE OR REPLACE FUNCTION public.is_internal_operator()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RETURN false; END IF;
 RETURN private.is_internal_operator();
END $$;
GRANT EXECUTE ON FUNCTION public.has_internal_permission(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_internal_operator() TO anon,authenticated;
