CREATE OR REPLACE FUNCTION public.grant_license_override_atomic(p_actor uuid,p_subscription uuid,p_extra integer,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_sub public.subscriptions%ROWTYPE; v_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id JOIN public.internal_permissions ip ON ip.id=rp.permission_id WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='licenses.override') THEN RAISE EXCEPTION 'Permission denied'; END IF;
 IF p_extra NOT BETWEEN 1 AND 10000 OR length(trim(coalesce(p_reason,''))) NOT BETWEEN 10 AND 1000 THEN RAISE EXCEPTION 'Invalid override'; END IF;
 SELECT * INTO v_sub FROM public.subscriptions WHERE id=p_subscription FOR UPDATE;
 IF NOT FOUND OR v_sub.status<>'ACTIVE' THEN RAISE EXCEPTION 'Subscription not active'; END IF;
 INSERT INTO public.license_overrides(subscription_id,granted_by,reason,extra_licenses) VALUES(p_subscription,p_actor,trim(p_reason),p_extra) RETURNING id INTO v_id;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,client_id,product_id,reason,after_json,source)
 VALUES(p_actor,'licenses.override_granted','license_override',v_id,v_sub.client_id,v_sub.product_id,trim(p_reason),jsonb_build_object('extra_licenses',p_extra),'7service');
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.grant_license_override_atomic(uuid,uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.grant_license_override_atomic(uuid,uuid,integer,text) TO service_role;
