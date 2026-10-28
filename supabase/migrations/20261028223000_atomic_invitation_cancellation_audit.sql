CREATE OR REPLACE FUNCTION public.cancel_invitation_atomic(p_actor uuid, p_invitation uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_status text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.internal_users u
    JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
    JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
    JOIN public.internal_permissions ip ON ip.id=rp.permission_id
    WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='invitations.manage'
  ) THEN RAISE EXCEPTION 'Invitation management permission required'; END IF;
  SELECT status INTO v_status FROM public.invitations WHERE id=p_invitation FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF v_status NOT IN ('PENDING','SENT') THEN RAISE EXCEPTION 'Invitation is not cancellable'; END IF;
  UPDATE public.invitations SET status='CANCELLED',cancelled_at=now() WHERE id=p_invitation;
  INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,source,before_json,after_json)
  VALUES(p_actor,'invitation.cancelled','invitation',p_invitation,'7service',jsonb_build_object('status',v_status),jsonb_build_object('status','CANCELLED'));
  RETURN p_invitation;
END $$;
REVOKE ALL ON FUNCTION public.cancel_invitation_atomic(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_invitation_atomic(uuid,uuid) TO service_role;
