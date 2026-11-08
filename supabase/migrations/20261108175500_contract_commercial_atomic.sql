-- 7Service contract-scoped commercial configuration. NOT APPLIED.
BEGIN;
CREATE OR REPLACE FUNCTION public.configure_contract_named_seats_atomic(
  p_actor uuid, p_contract uuid, p_license_limit integer, p_group uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_owner uuid; v_current integer; v_mode text;
BEGIN
  IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.internal_users u
    JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
    JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
    JOIN public.internal_permissions ip ON ip.id=rp.permission_id
    WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='contracts.manage'
  ) THEN
    RAISE EXCEPTION 'ACTOR_NOT_ALLOWED' USING ERRCODE='42501';
  END IF;
  IF p_license_limit IS NULL OR p_license_limit < 0 THEN
    RAISE EXCEPTION 'INVALID_LICENSE_LIMIT';
  END IF;

  SELECT client_id INTO v_owner FROM public.contracts WHERE id=p_contract FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CONTRACT_NOT_FOUND'; END IF;

  IF p_group IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM public.customer_group_members m
    JOIN public.customer_groups g ON g.id=m.group_id
    WHERE m.group_id=p_group AND m.client_id=v_owner
      AND m.status='ACTIVE' AND g.status='ACTIVE'
  ) THEN RAISE EXCEPTION 'CONTRACT_OWNER_NOT_IN_GROUP'; END IF;

  SELECT enforcement_mode INTO v_mode FROM public.contract_seat_pools
   WHERE contract_id=p_contract FOR UPDATE;
  SELECT count(*) INTO v_current FROM public.contract_named_seats
   WHERE contract_id=p_contract AND status IN ('RESERVED','ACTIVE');

  IF p_license_limit < v_current THEN
    RAISE EXCEPTION 'LIMIT_BELOW_OCCUPIED_SEATS';
  END IF;
  IF v_mode = 'ENFORCED' THEN
    RAISE EXCEPTION 'ACTIVE_POOL_REQUIRES_CONTROLLED_CHANGE';
  END IF;

  INSERT INTO public.contract_seat_pools(contract_id,group_id,license_limit,enforcement_mode)
  VALUES(p_contract,p_group,p_license_limit,'SHADOW')
  ON CONFLICT(contract_id) DO UPDATE
   SET group_id=EXCLUDED.group_id,license_limit=EXCLUDED.license_limit,
       updated_at=now();

  INSERT INTO public.audit_logs(
    actor_internal_user_id,action,target_type,target_id,source,client_id,metadata_safe)
  VALUES(p_actor,'contract.named_seats_configured','contract',p_contract,'7service',
         v_owner,jsonb_build_object('limit',p_license_limit,
         'group_id',p_group,'mode','SHADOW'));
END;
$$;
REVOKE ALL ON FUNCTION public.configure_contract_named_seats_atomic(uuid,uuid,integer,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.configure_contract_named_seats_atomic(uuid,uuid,integer,uuid)
 TO service_role;

CREATE OR REPLACE FUNCTION public.enable_contract_product_atomic(
  p_actor uuid,p_contract uuid,p_product uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_owner uuid;
BEGIN
  IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.internal_users u
    JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
    JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
    JOIN public.internal_permissions ip ON ip.id=rp.permission_id
    WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='contracts.manage'
  ) THEN
    RAISE EXCEPTION 'ACTOR_NOT_ALLOWED' USING ERRCODE='42501';
  END IF;
  SELECT client_id INTO v_owner FROM public.contracts WHERE id=p_contract;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.products
                             WHERE id=p_product AND status='ACTIVE') THEN
    RAISE EXCEPTION 'CONTRACT_OR_PRODUCT_NOT_ELIGIBLE';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.contract_seat_pools WHERE contract_id=p_contract) THEN
    RAISE EXCEPTION 'CONFIGURE_LICENSE_POOL_FIRST';
  END IF;

  INSERT INTO public.contract_product_entitlements(contract_id,product_id)
  VALUES(p_contract,p_product) ON CONFLICT DO NOTHING;
  INSERT INTO public.audit_logs(
    actor_internal_user_id,action,target_type,target_id,source,client_id,metadata_safe)
  VALUES(p_actor,'contract.product_authorized','contract',p_contract,'7service',
         v_owner,jsonb_build_object('product_id',p_product));
END;
$$;
REVOKE ALL ON FUNCTION public.enable_contract_product_atomic(uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enable_contract_product_atomic(uuid,uuid,uuid)
 TO service_role;
COMMIT;
