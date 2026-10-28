CREATE OR REPLACE FUNCTION public.register_product_environment_atomic(
 p_actor_id uuid,p_deployment_id uuid,p_environment text,p_entry_url text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id uuid; v_product_id uuid;
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
  JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
  JOIN public.internal_permissions ip ON ip.id=rp.permission_id
  WHERE u.id=p_actor_id AND u.status='ACTIVE' AND ip.code='clients.manage'
 ) THEN RAISE EXCEPTION 'Unauthorized environment registration'; END IF;
 IF p_environment NOT IN ('PRODUCTION','HOMOLOGATION','DEVELOPMENT','DEMO')
 THEN RAISE EXCEPTION 'Invalid environment type'; END IF;
 IF NULLIF(p_entry_url,'') IS NOT NULL AND p_entry_url NOT LIKE 'https://%'
 THEN RAISE EXCEPTION 'HTTPS URL required'; END IF;
 SELECT product_id INTO v_product_id FROM public.product_deployments
 WHERE id=p_deployment_id AND status <> 'RETIRED';
 IF v_product_id IS NULL THEN RAISE EXCEPTION 'Deployment missing or retired'; END IF;
 INSERT INTO public.product_environments(deployment_id,environment,entry_url,status)
 VALUES(p_deployment_id,p_environment,NULLIF(p_entry_url,''),'PLANNED') RETURNING id INTO v_id;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,product_id,source)
 VALUES(p_actor_id,'environment.planned','product_environment',v_id,v_product_id,'7service');
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.register_product_environment_atomic(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_product_environment_atomic(uuid,uuid,text,text) TO service_role;
