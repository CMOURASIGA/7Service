-- 7Service existing-installation company mapping. NOT APPLIED.
BEGIN;
CREATE OR REPLACE FUNCTION public.bind_environment_company_atomic(
 p_actor uuid,p_environment uuid,p_client uuid,p_remote_company text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_product uuid;v_deployment uuid;
BEGIN
 IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.internal_users WHERE id=p_actor AND status='ACTIVE')
  OR NOT EXISTS(SELECT 1 FROM public.clients WHERE id=p_client AND status='ACTIVE') THEN
  RAISE EXCEPTION 'OPERATOR_OR_COMPANY_NOT_ELIGIBLE' USING ERRCODE='42501';
 END IF;
 IF length(trim(coalesce(p_remote_company,''))) NOT BETWEEN 1 AND 128 THEN
  RAISE EXCEPTION 'INVALID_REMOTE_COMPANY_ID';
 END IF;
 SELECT pe.deployment_id,pd.product_id INTO v_deployment,v_product
 FROM public.product_environments pe
 JOIN public.product_deployments pd ON pd.id=pe.deployment_id
 JOIN public.environment_connections ec ON ec.environment_id=pe.id
 WHERE pe.id=p_environment AND pe.status='ACTIVE' AND ec.status='VERIFIED';
 IF NOT FOUND THEN RAISE EXCEPTION 'ENVIRONMENT_NOT_VERIFIED'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.client_deployments
  WHERE deployment_id=v_deployment AND product_id=v_product AND client_id=p_client
 ) THEN RAISE EXCEPTION 'COMPANY_NOT_ASSIGNED_TO_INSTALLATION' USING ERRCODE='42501'; END IF;
 INSERT INTO public.environment_company_bindings(environment_id,client_id,remote_company_id)
 VALUES(p_environment,p_client,trim(p_remote_company))
 ON CONFLICT(environment_id,client_id)
 DO UPDATE SET remote_company_id=EXCLUDED.remote_company_id;
 INSERT INTO public.audit_logs(
  actor_internal_user_id,action,target_type,target_id,client_id,product_id,source,metadata_safe)
 VALUES(p_actor,'environment.company_mapped','product_environment',p_environment,
  p_client,v_product,'7service',jsonb_build_object('remote_company_id',p_remote_company));
END;
$$;
REVOKE ALL ON FUNCTION public.bind_environment_company_atomic(uuid,uuid,uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bind_environment_company_atomic(uuid,uuid,uuid,text)
 TO service_role;
COMMIT;
