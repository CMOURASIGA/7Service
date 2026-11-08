-- 7Service: attach a group company to an EXISTING deployment.
-- NOT APPLIED. This creates no database/project and does not touch remote data.
BEGIN;
CREATE OR REPLACE FUNCTION public.attach_group_company_to_deployment_atomic(
  p_actor uuid, p_deployment uuid, p_client uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_product uuid;
  v_model text;
  v_status text;
  v_group uuid;
  v_existing integer;
BEGIN
  IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.internal_users u
    JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
    JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
    JOIN public.internal_permissions ip ON ip.id=rp.permission_id
    WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='clients.manage'
  ) THEN RAISE EXCEPTION 'ACTOR_NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;

  -- Serialize changes to the deployment's tenant list.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_deployment::text,0));
  SELECT product_id,model,status INTO v_product,v_model,v_status
   FROM public.product_deployments WHERE id=p_deployment FOR UPDATE;
  IF NOT FOUND OR v_status NOT IN ('ACTIVE','PLANNED') THEN
    RAISE EXCEPTION 'DEPLOYMENT_NOT_ELIGIBLE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id=p_client AND status='ACTIVE') THEN
    RAISE EXCEPTION 'CLIENT_NOT_ACTIVE';
  END IF;
  IF EXISTS(SELECT 1 FROM public.client_deployments
            WHERE deployment_id=p_deployment AND client_id=p_client) THEN
    RETURN;
  END IF;

  -- A shared deployment may serve multiple clients, but dedicated deployments
  -- are restricted to a single group, never a second unrelated customer.
  IF v_model='DEDICATED' THEN
    SELECT m.group_id INTO v_group
      FROM public.customer_group_members m
      JOIN public.customer_groups g ON g.id=m.group_id
     WHERE m.client_id=p_client AND m.status='ACTIVE' AND g.status='ACTIVE';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'DEDICATED_DEPLOYMENT_REQUIRES_GROUP' USING ERRCODE='42501';
    END IF;
    IF EXISTS(
      SELECT 1 FROM public.client_deployments cd
      WHERE cd.deployment_id=p_deployment
        AND NOT EXISTS(
          SELECT 1 FROM public.customer_group_members gm
          WHERE gm.group_id=v_group AND gm.client_id=cd.client_id AND gm.status='ACTIVE'
        )
    ) THEN
      RAISE EXCEPTION 'DEDICATED_DEPLOYMENT_DIFFERENT_GROUP' USING ERRCODE='42501';
    END IF;
  ELSIF v_model<>'SHARED' THEN
    RAISE EXCEPTION 'DEPLOYMENT_MODEL_NOT_SUPPORTED';
  END IF;

  -- Contract must explicitly cover the product and requested company.
  IF NOT EXISTS(
    SELECT 1 FROM public.contracts c
    JOIN public.contract_seat_pools p ON p.contract_id=c.id
    JOIN public.contract_product_entitlements e
      ON e.contract_id=c.id AND e.product_id=v_product
    WHERE c.status='ACTIVE'
      AND c.start_date<=current_date
      AND (c.end_date IS NULL OR c.end_date>=current_date)
      AND (
        c.client_id=p_client OR
        (p.group_id IS NOT NULL AND EXISTS(
          SELECT 1 FROM public.customer_group_members m
           WHERE m.group_id=p.group_id AND m.client_id=p_client
             AND m.status='ACTIVE'
        ))
      )
  ) THEN
    RAISE EXCEPTION 'PRODUCT_NOT_CONTRACTED_FOR_COMPANY' USING ERRCODE='42501';
  END IF;

  INSERT INTO public.client_deployments(client_id,product_id,deployment_id)
    VALUES(p_client,v_product,p_deployment);
  INSERT INTO public.audit_logs(
    actor_internal_user_id,action,target_type,target_id,client_id,product_id,source,metadata_safe
  ) VALUES(
    p_actor,'deployment.company_attached','product_deployment',p_deployment,
    p_client,v_product,'7service',
    jsonb_build_object('model',v_model,'group_id',v_group)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.attach_group_company_to_deployment_atomic(uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.attach_group_company_to_deployment_atomic(uuid,uuid,uuid)
 TO service_role;
COMMIT;
