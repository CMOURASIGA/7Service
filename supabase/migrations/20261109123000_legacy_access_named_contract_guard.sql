-- Migration staged for existing 7Service Supabase; NOT APPLIED.
-- Preserves the exact existing legacy authorization implementation from the
-- live schema, adding fail-closed guards only for contracts switched to ENFORCED.
-- SHADOW and contracts without a seat pool continue using the unchanged legacy
-- authorization flow, preserving existing client access before cutover.
-- Never apply without controlled SQL regression testing and an approved rollout.
BEGIN;

CREATE OR REPLACE FUNCTION public.grant_product_access_atomic(p_actor uuid, p_identity uuid, p_subscription uuid, p_role uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  s public.subscriptions%ROWTYPE;
  m uuid;
  v_id uuid;
  v_role_product uuid;
  v_role_status text;
  v_identity_status text;
  v_auth_id uuid;
  v_client_status text;
  v_product_status text;
  v_access_status text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.internal_users u
    JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
    JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
    JOIN public.internal_permissions ip ON ip.id=rp.permission_id
    WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='users.access.manage'
  ) THEN RAISE EXCEPTION 'Permission denied'; END IF;

  SELECT * INTO s FROM public.subscriptions WHERE id=p_subscription FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found'; END IF;
 IF EXISTS (SELECT 1 FROM public.contract_seat_pools pool WHERE pool.contract_id=s.contract_id AND pool.enforcement_mode='ENFORCED') THEN
   RAISE EXCEPTION 'LEGACY_ACCESS_BLOCKED_FOR_NAMED_CONTRACT' USING ERRCODE='42501';
 END IF;


  SELECT status,auth_user_id INTO v_identity_status,v_auth_id
  FROM public.identities WHERE id=p_identity FOR UPDATE;
  IF v_identity_status NOT IN ('ACTIVE','PENDING_INVITE') OR v_identity_status IS NULL
    THEN RAISE EXCEPTION 'Identity not eligible'; END IF;

  SELECT status INTO v_client_status FROM public.clients WHERE id=s.client_id;
  IF v_client_status IS DISTINCT FROM 'ACTIVE'
    THEN RAISE EXCEPTION 'Client inactive'; END IF;
  SELECT status INTO v_product_status FROM public.products WHERE id=s.product_id;
  IF v_product_status IS DISTINCT FROM 'ACTIVE'
    THEN RAISE EXCEPTION 'Product inactive'; END IF;

  SELECT id INTO m FROM public.client_memberships
  WHERE identity_id=p_identity AND client_id=s.client_id AND status='ACTIVE';
  IF m IS NULL THEN RAISE EXCEPTION 'Membership is not active'; END IF;

  SELECT product_id,status INTO v_role_product,v_role_status
  FROM public.product_roles WHERE id=p_role;
  IF v_role_product IS DISTINCT FROM s.product_id
    OR v_role_status IS DISTINCT FROM 'ACTIVE'
    THEN RAISE EXCEPTION 'Role not eligible for product'; END IF;

  IF s.status<>'ACTIVE' OR s.start_date>current_date OR
     (s.end_date IS NOT NULL AND current_date>s.end_date+s.grace_days)
    THEN RAISE EXCEPTION 'Subscription not active'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_product_access
    WHERE identity_id=p_identity AND subscription_id=p_subscription
      AND status IN ('ACTIVE','PENDING')
  ) THEN RAISE EXCEPTION 'Product access already active or pending'; END IF;

  IF (
    SELECT count(*) FROM public.user_product_access
    WHERE subscription_id=p_subscription AND status IN ('ACTIVE','PENDING')
  ) >= s.license_limit + coalesce((
    SELECT sum(extra_licenses) FROM public.license_overrides
    WHERE subscription_id=p_subscription
  ),0)
    THEN RAISE EXCEPTION 'License limit reached'; END IF;

  v_access_status := CASE
    WHEN v_identity_status='ACTIVE' AND v_auth_id IS NOT NULL THEN 'ACTIVE'
    ELSE 'PENDING'
  END;

  INSERT INTO public.user_product_access(
    identity_id,subscription_id,product_role_id,membership_id,client_id,status
  ) VALUES(
    p_identity,p_subscription,p_role,m,s.client_id,v_access_status
  ) RETURNING id INTO v_id;

  INSERT INTO public.audit_logs(
    actor_internal_user_id,action,target_type,target_id,client_id,
    product_id,source,metadata_safe
  ) VALUES(
    p_actor,'access.granted','user_product_access',v_id,s.client_id,
    s.product_id,'7service',jsonb_build_object('status',v_access_status)
  );
  RETURN v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.change_product_access_status_atomic(p_actor uuid, p_access uuid, p_identity uuid, p_status text, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v public.user_product_access%ROWTYPE; s public.subscriptions%ROWTYPE;
BEGIN
 IF p_status NOT IN ('ACTIVE','SUSPENDED','REVOKED') THEN RAISE EXCEPTION 'Invalid access state'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id JOIN public.internal_permissions ip ON ip.id=rp.permission_id WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='users.access.manage') THEN RAISE EXCEPTION 'Permission denied'; END IF;
 SELECT * INTO v FROM public.user_product_access WHERE id=p_access AND identity_id=p_identity FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access not found'; END IF;
 IF v.status='REVOKED' OR v.status=p_status THEN RAISE EXCEPTION 'Access transition not allowed'; END IF;
 IF p_status IN ('SUSPENDED','REVOKED') AND length(trim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'Reason required'; END IF;
 IF length(coalesce(p_reason,''))>1000 THEN RAISE EXCEPTION 'Reason too long'; END IF;
 IF p_status='ACTIVE' THEN
   SELECT * INTO s FROM public.subscriptions WHERE id=v.subscription_id FOR UPDATE;
   
 IF EXISTS (SELECT 1 FROM public.contract_seat_pools pool WHERE pool.contract_id=s.contract_id AND pool.enforcement_mode='ENFORCED') THEN
   RAISE EXCEPTION 'LEGACY_ACCESS_BLOCKED_FOR_NAMED_CONTRACT' USING ERRCODE='42501';
 END IF;
 IF NOT FOUND OR s.status<>'ACTIVE' OR s.start_date>current_date OR (s.end_date IS NOT NULL AND current_date>s.end_date+coalesce(s.grace_days,0)) THEN RAISE EXCEPTION 'Subscription not active'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.client_memberships cm JOIN public.identities i ON i.id=cm.identity_id WHERE cm.id=v.membership_id AND cm.identity_id=p_identity AND cm.client_id=v.client_id AND cm.status='ACTIVE' AND i.status='ACTIVE') THEN RAISE EXCEPTION 'Identity or membership inactive'; END IF;
 END IF;
 UPDATE public.user_product_access SET status=p_status,
 suspended_reason=CASE WHEN p_status='SUSPENDED' THEN p_reason ELSE NULL END,
 suspended_at=CASE WHEN p_status='SUSPENDED' THEN now() ELSE NULL END
 WHERE id=p_access;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,client_id,reason,source,before_json,after_json)
 VALUES(p_actor,'access.'||lower(p_status),'user_product_access',p_access,v.client_id,p_reason,'7service',jsonb_build_object('status',v.status),jsonb_build_object('status',p_status));
 RETURN p_access;
END $function$
;

COMMIT;
