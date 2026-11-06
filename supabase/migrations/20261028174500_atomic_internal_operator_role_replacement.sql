CREATE OR REPLACE FUNCTION public.replace_internal_operator_roles(
  p_actor_id uuid, p_target_id uuid, p_role_codes text[]
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_ids uuid[];
  v_count integer;
  v_is_super boolean;
  v_other_supers integer;
BEGIN
  PERFORM pg_advisory_xact_lock(7316221);
  IF NOT EXISTS (
    SELECT 1 FROM public.internal_users u
    JOIN public.internal_user_roles ur ON ur.internal_user_id = u.id
    JOIN public.internal_role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.internal_permissions ip ON ip.id = rp.permission_id
    WHERE u.id = p_actor_id AND u.status = 'ACTIVE'
      AND ip.code = 'internal_users.manage'
  ) THEN RAISE EXCEPTION 'Unauthorized operator'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.internal_users WHERE id = p_target_id)
  THEN RAISE EXCEPTION 'Unknown operator'; END IF;
  IF coalesce(array_length(p_role_codes,1),0) = 0
  THEN RAISE EXCEPTION 'At least one role required'; END IF;
  SELECT array_agg(id), count(*) INTO v_ids, v_count FROM public.internal_roles
    WHERE code = ANY(p_role_codes);
  IF v_count <> (SELECT count(DISTINCT code) FROM unnest(p_role_codes) AS code)
  THEN RAISE EXCEPTION 'Invalid or duplicate role'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.internal_user_roles ur
    JOIN public.internal_roles r ON r.id=ur.role_id
    WHERE ur.internal_user_id=p_target_id AND r.code='SUPER_ADMIN'
  ) INTO v_is_super;
  IF v_is_super AND NOT ('SUPER_ADMIN'=ANY(p_role_codes)) THEN
    SELECT count(DISTINCT u.id) INTO v_other_supers
    FROM public.internal_users u
    JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
    JOIN public.internal_roles r ON r.id=ur.role_id
    WHERE r.code='SUPER_ADMIN' AND u.status='ACTIVE' AND u.id<>p_target_id;
    IF v_other_supers=0 THEN RAISE EXCEPTION 'Cannot remove last active superadmin'; END IF;
  END IF;
  DELETE FROM public.internal_user_roles WHERE internal_user_id=p_target_id;
  INSERT INTO public.internal_user_roles(internal_user_id,role_id,assigned_by)
    SELECT p_target_id,unnest(v_ids),p_actor_id;
  INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,source)
  VALUES(p_actor_id,'internal_user.roles_updated','internal_user',p_target_id,'7service');
END; $$;
REVOKE ALL ON FUNCTION public.replace_internal_operator_roles(uuid,uuid,text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_internal_operator_roles(uuid,uuid,text[]) TO service_role;
