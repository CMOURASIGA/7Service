-- 7Service: group administration, service-only and audited.
-- NOT APPLIED. Follows central_provisioning_additive schema.
BEGIN;

CREATE OR REPLACE FUNCTION public.create_customer_group_atomic(
  p_actor uuid, p_name text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_id uuid;
BEGIN
  IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.internal_users WHERE id=p_actor AND status='ACTIVE')
     OR length(trim(coalesce(p_name,''))) NOT BETWEEN 3 AND 160 THEN
    RAISE EXCEPTION 'INVALID_GROUP_OR_ACTOR' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.customer_groups(name) VALUES(trim(p_name)) RETURNING id INTO v_id;
  INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,source,metadata_safe)
  VALUES(p_actor,'customer_group.created','customer_group',v_id,'7service',
    jsonb_build_object('name',trim(p_name)));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_customer_group_atomic(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_group_atomic(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.add_company_to_customer_group_atomic(
  p_actor uuid, p_group uuid, p_client uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.internal_users WHERE id=p_actor AND status='ACTIVE')
     OR NOT EXISTS (SELECT 1 FROM public.customer_groups WHERE id=p_group AND status='ACTIVE')
     OR NOT EXISTS (SELECT 1 FROM public.clients WHERE id=p_client AND status='ACTIVE') THEN
    RAISE EXCEPTION 'GROUP_OR_COMPANY_NOT_ELIGIBLE' USING ERRCODE='42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_client::text,0));
  IF EXISTS (SELECT 1 FROM public.customer_group_members
             WHERE client_id=p_client AND status='ACTIVE' AND group_id<>p_group) THEN
    RAISE EXCEPTION 'COMPANY_ALREADY_LINKED_TO_ANOTHER_GROUP';
  END IF;
  INSERT INTO public.customer_group_members(group_id,client_id,status)
  VALUES(p_group,p_client,'ACTIVE')
  ON CONFLICT(group_id,client_id) DO UPDATE SET status='ACTIVE';
  INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,source,client_id,metadata_safe)
  VALUES(p_actor,'customer_group.company_linked','customer_group',p_group,'7service',p_client,
    jsonb_build_object('company_id',p_client));
END;
$$;
REVOKE ALL ON FUNCTION public.add_company_to_customer_group_atomic(uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.add_company_to_customer_group_atomic(uuid,uuid,uuid)
 TO service_role;
COMMIT;
