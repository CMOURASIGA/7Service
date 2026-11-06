CREATE OR REPLACE FUNCTION public.create_dedicated_deployment_atomic(
 p_actor_id uuid,p_client_id uuid,p_product_id uuid,p_name text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
  JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
  JOIN public.internal_permissions ip ON ip.id=rp.permission_id
  WHERE u.id=p_actor_id AND u.status='ACTIVE' AND ip.code='clients.manage'
 ) THEN RAISE EXCEPTION 'Unauthorized deployment registration'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.clients WHERE id=p_client_id AND status='ACTIVE')
 OR NOT EXISTS(SELECT 1 FROM public.products WHERE id=p_product_id AND status='ACTIVE')
 THEN RAISE EXCEPTION 'Client/product inactive or missing'; END IF;
 IF char_length(trim(p_name)) NOT BETWEEN 3 AND 120 THEN RAISE EXCEPTION 'Invalid deployment name'; END IF;
 INSERT INTO public.product_deployments(product_id,model,name,status)
 VALUES(p_product_id,'DEDICATED',trim(p_name),'PLANNED') RETURNING id INTO v_id;
 INSERT INTO public.client_deployments(client_id,product_id,deployment_id)
 VALUES(p_client_id,p_product_id,v_id);
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,client_id,product_id,source)
 VALUES(p_actor_id,'deployment.planned','product_deployment',v_id,p_client_id,p_product_id,'7service');
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_dedicated_deployment_atomic(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_dedicated_deployment_atomic(uuid,uuid,uuid,text) TO service_role;
