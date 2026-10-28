CREATE OR REPLACE FUNCTION public.change_client_status_atomic(p_actor uuid,p_client uuid,p_status text,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_previous text;
BEGIN
 IF p_status NOT IN ('ACTIVE','SUSPENDED','CLOSED') THEN RAISE EXCEPTION 'Invalid client status'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id JOIN public.internal_permissions ip ON ip.id=rp.permission_id WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='clients.manage') THEN RAISE EXCEPTION 'Permission denied'; END IF;
 SELECT status INTO v_previous FROM public.clients WHERE id=p_client FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Client not found'; END IF;
 IF v_previous='CLOSED' THEN RAISE EXCEPTION 'Closed clients cannot be reactivated'; END IF;
 IF v_previous=p_status THEN RAISE EXCEPTION 'Client already has requested status'; END IF;
 IF p_status IN ('SUSPENDED','CLOSED') AND (p_reason IS NULL OR length(trim(p_reason))<5) THEN RAISE EXCEPTION 'Reason required'; END IF;
 IF length(coalesce(p_reason,''))>1000 THEN RAISE EXCEPTION 'Reason too long'; END IF;
 UPDATE public.clients SET status=p_status WHERE id=p_client;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,client_id,before_json,after_json,reason,source)
 VALUES(p_actor,CASE p_status WHEN 'ACTIVE' THEN 'client.reactivated' WHEN 'SUSPENDED' THEN 'client.suspended' ELSE 'client.closed' END,'client',p_client,p_client,jsonb_build_object('status',v_previous),jsonb_build_object('status',p_status),p_reason,'7service');
 RETURN p_client;
END $$;
REVOKE ALL ON FUNCTION public.change_client_status_atomic(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.change_client_status_atomic(uuid,uuid,text,text) TO service_role;
