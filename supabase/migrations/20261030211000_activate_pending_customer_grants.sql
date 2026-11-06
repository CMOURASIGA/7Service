-- After an invitee confirms Auth and sets a password, release only
-- previously granted, still-eligible PENDING product accesses.
-- No new grant, membership, internal user or administrative role is created.
CREATE OR REPLACE FUNCTION public.activate_identity_after_auth_atomic(p_auth_user_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE v_id uuid; v_status text;
BEGIN
  SELECT id, status INTO v_id, v_status
  FROM public.identities
  WHERE auth_user_id = p_auth_user_id
  FOR UPDATE;

  IF v_id IS NULL THEN RAISE EXCEPTION 'Identity not linked to verified Auth account'; END IF;
  IF v_status = 'ACTIVE' THEN RETURN 'ACTIVE'; END IF;
  IF v_status <> 'PENDING_INVITE' THEN
    RAISE EXCEPTION 'Identity status does not permit activation';
  END IF;

  UPDATE public.identities
  SET status='ACTIVE', activated_at=now()
  WHERE id=v_id AND status='PENDING_INVITE';

  INSERT INTO public.audit_logs(actor_identity_id,action,target_type,target_id,source)
  VALUES(v_id,'identity.activated','identity',v_id,'7service');

  WITH activated_grants AS (
    UPDATE public.user_product_access a
    SET status='ACTIVE', updated_at=now()
    FROM public.subscriptions s,
         public.client_memberships m,
         public.clients c,
         public.products p,
         public.product_roles r
    WHERE a.identity_id=v_id
      AND a.status='PENDING'
      AND a.membership_id=m.id
      AND m.identity_id=v_id
      AND m.client_id=a.client_id
      AND m.status='ACTIVE'
      AND s.id=a.subscription_id
      AND s.client_id=a.client_id
      AND s.product_id=p.id
      AND s.status='ACTIVE'
      AND s.start_date<=current_date
      AND (s.end_date IS NULL OR s.end_date>=current_date)
      AND c.id=a.client_id
      AND c.status='ACTIVE'
      AND p.status='ACTIVE'
      AND r.id=a.product_role_id
      AND r.product_id=p.id
      AND r.status='ACTIVE'
      AND (a.valid_from IS NULL OR a.valid_from<=current_date)
      AND (a.valid_until IS NULL OR a.valid_until>=current_date)
    RETURNING a.id,a.client_id,a.subscription_id
  )
  INSERT INTO public.audit_logs(
    actor_identity_id,action,target_type,target_id,client_id,product_id,source
  )
  SELECT v_id,'access.activated_after_invite','user_product_access',
    a.id,a.client_id,s.product_id,'7service'
  FROM activated_grants a
  JOIN public.subscriptions s ON s.id=a.subscription_id;

  RETURN 'ACTIVE';
END;
$$;

REVOKE ALL ON FUNCTION public.activate_identity_after_auth_atomic(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.activate_identity_after_auth_atomic(uuid)
  TO service_role;
