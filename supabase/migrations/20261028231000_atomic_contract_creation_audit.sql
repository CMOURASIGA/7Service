CREATE OR REPLACE FUNCTION public.create_contract_atomic(p_actor uuid,p_client uuid,p_reference text,p_start date,p_end date,p_notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id JOIN public.internal_permissions ip ON ip.id=rp.permission_id WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='contracts.manage')
 THEN RAISE EXCEPTION 'Permission denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.clients WHERE id=p_client AND status='ACTIVE') THEN RAISE EXCEPTION 'Client is not active'; END IF;
 IF length(trim(coalesce(p_reference,'')))=0 OR length(p_reference)>200 THEN RAISE EXCEPTION 'Invalid reference'; END IF;
 IF p_start IS NULL OR (p_end IS NOT NULL AND p_end<p_start) THEN RAISE EXCEPTION 'Invalid contract dates'; END IF;
 INSERT INTO public.contracts(client_id,reference,start_date,end_date,notes) VALUES(p_client,trim(p_reference),p_start,p_end,p_notes) RETURNING id INTO v_id;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,client_id,source)
 VALUES(p_actor,'contract.created','contract',v_id,p_client,'7service');
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_contract_atomic(uuid,uuid,text,date,date,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_contract_atomic(uuid,uuid,text,date,date,text) TO service_role;
