CREATE OR REPLACE FUNCTION public.create_subscription_atomic(
 p_actor uuid,p_client uuid,p_contract uuid,p_product uuid,p_start date,p_end date,
 p_grace integer,p_limit integer,p_monthly numeric,p_implementation numeric
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id JOIN public.internal_permissions ip ON ip.id=rp.permission_id WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='contracts.manage') THEN RAISE EXCEPTION 'Permission denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.clients WHERE id=p_client AND status='ACTIVE') THEN RAISE EXCEPTION 'Client is not active'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.contracts WHERE id=p_contract AND client_id=p_client AND status='ACTIVE') THEN RAISE EXCEPTION 'Contract is not active for client'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.products WHERE id=p_product AND status='ACTIVE') THEN RAISE EXCEPTION 'Product is not active'; END IF;
 IF p_start IS NULL OR (p_end IS NOT NULL AND p_end<p_start) OR p_grace NOT BETWEEN 0 AND 30 OR p_limit NOT BETWEEN 0 AND 100000 OR (p_monthly IS NOT NULL AND p_monthly<0) OR (p_implementation IS NOT NULL AND p_implementation<0) THEN RAISE EXCEPTION 'Invalid subscription values'; END IF;
 INSERT INTO public.subscriptions(client_id,contract_id,product_id,start_date,end_date,grace_days,license_limit,monthly_value,implementation_value)
 VALUES(p_client,p_contract,p_product,p_start,p_end,p_grace,p_limit,p_monthly,p_implementation) RETURNING id INTO v_id;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,client_id,product_id,source)
 VALUES(p_actor,'subscription.created','subscription',v_id,p_client,p_product,'7service');
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_subscription_atomic(uuid,uuid,uuid,uuid,date,date,integer,integer,numeric,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_subscription_atomic(uuid,uuid,uuid,uuid,date,date,integer,integer,numeric,numeric) TO service_role;
