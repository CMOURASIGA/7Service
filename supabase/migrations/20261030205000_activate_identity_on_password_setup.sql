-- Activate only the identity bound to the verified Supabase Auth user after
-- successful first-time password creation. The application server validates
-- auth.getUser() before calling. No internal role is created or assigned.
CREATE OR REPLACE FUNCTION public.activate_identity_after_auth_atomic(p_auth_user_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE v_id uuid; v_status text;
BEGIN
  SELECT id, status INTO v_id, v_status
  FROM public.identities WHERE auth_user_id = p_auth_user_id FOR UPDATE;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Identity not linked to verified Auth account'; END IF;
  IF v_status = 'ACTIVE' THEN RETURN 'ACTIVE'; END IF;
  IF v_status <> 'PENDING_INVITE' THEN
    RAISE EXCEPTION 'Identity status does not permit activation';
  END IF;
  UPDATE public.identities
  SET status = 'ACTIVE', activated_at = now()
  WHERE id = v_id AND status = 'PENDING_INVITE';
  INSERT INTO public.audit_logs (actor_identity_id, action, target_type, target_id, source)
  VALUES (v_id, 'identity.activated', 'identity', v_id, '7service');
  RETURN 'ACTIVE';
END;
$$;
REVOKE ALL ON FUNCTION public.activate_identity_after_auth_atomic(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_identity_after_auth_atomic(uuid)
TO service_role;
