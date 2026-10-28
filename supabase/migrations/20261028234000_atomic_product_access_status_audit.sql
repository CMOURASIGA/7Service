CREATE OR REPLACE FUNCTION public.change_product_access_status_atomic(p_actor uuid,p_access uuid,p_identity uuid,p_status text,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v public.user_product_access%ROWTYPE; s public.subscriptions%ROWTYPE;
BEGIN
 IF p_status NOT IN ('ACTIVE','SUSPENDED','REVOKED') THEN RAISE EXCEPTION 'Invalid access state'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id JOIN public.internal_permissions ip ON ip.id=rp.permission_id WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='users.access.manage') THEN RAISE EXCEPTION 'Permission denied'; END IF;
 SELECT * INTO v FROM public.user_product_access WHERE id=p_access AND identity_id=p_identity FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access not found'; END IF;
 IF v.status='REVOKED' OR v.status=p_status THEN RAISE EXCEPTION 'Access transition not allowed'; END IF;
 IF p_status IN ('SUSPENDED','REVOKED') AND length(trim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'Reason required'; END IF;
 IF length(coalesce(p_reason,''))>1000 THEN RAISE EXCEPTION 'Reason too long'; END IF;
 IF p_status='ACTIVE' THEN
   SELECT * INTO s FROM public.subscriptions WHERE id=v.subscription_id FOR UPDATE;
   IF NOT FOUND OR s.status<>'ACTIVE' OR s.start_date>current_date OR (s.end_date IS NOT NULL AND current_date>s.end_date+coalesce(s.grace_days,0)) THEN RAISE EXCEPTION 'Subscription not active'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.client_memberships cm JOIN public.identities i ON i.id=cm.identity_id WHERE cm.id=v.membership_id AND cm.identity_id=p_identity AND cm.client_id=v.client_id AND cm.status='ACTIVE' AND i.status='ACTIVE') THEN RAISE EXCEPTION 'Identity or membership inactive'; END IF;
 END IF;
 UPDATE public.user_product_access SET status=p_status,
 suspended_reason=CASE WHEN p_status='SUSPENDED' THEN p_reason ELSE NULL END,
 suspended_at=CASE WHEN p_status='SUSPENDED' THEN now() ELSE NULL END
 WHERE id=p_access;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,client_id,reason,source,before_json,after_json)
 VALUES(p_actor,'access.'||lower(p_status),'user_product_access',p_access,v.client_id,p_reason,'7service',jsonb_build_object('status',v.status),jsonb_build_object('status',p_status));
 RETURN p_access;
END $$;
REVOKE ALL ON FUNCTION public.change_product_access_status_atomic(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.change_product_access_status_atomic(uuid,uuid,uuid,text,text) TO service_role;
