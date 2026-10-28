CREATE OR REPLACE FUNCTION public.record_client_export_delivery_atomic(p_actor uuid,p_client uuid,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id JOIN public.internal_permissions ip ON ip.id=rp.permission_id WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='clients.manage') THEN RAISE EXCEPTION 'Permission denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.clients WHERE id=p_client) THEN RAISE EXCEPTION 'Client not found'; END IF;
 IF length(trim(coalesce(p_reason,'')))<5 OR length(p_reason)>1000 THEN RAISE EXCEPTION 'Delivery justification required (5-1000 chars)'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.audit_logs WHERE client_id=p_client AND action='client.export_requested') THEN RAISE EXCEPTION 'Export request not recorded'; END IF;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,client_id,reason,source)
 VALUES(p_actor,'client.export_delivered','client',p_client,p_client,trim(p_reason),'7service');
 RETURN p_client;
END $$;
REVOKE ALL ON FUNCTION public.record_client_export_delivery_atomic(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_client_export_delivery_atomic(uuid,uuid,text) TO service_role;
