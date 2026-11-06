CREATE OR REPLACE FUNCTION public.grant_product_access_atomic(p_actor uuid,p_identity uuid,p_subscription uuid,p_role uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE s public.subscriptions%ROWTYPE; m uuid; v_id uuid; v_role_product uuid; v_role_status text; v_identity_status text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id JOIN public.internal_permissions ip ON ip.id=rp.permission_id WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='users.access.manage') THEN RAISE EXCEPTION 'Permission denied'; END IF;
 SELECT * INTO s FROM public.subscriptions WHERE id=p_subscription FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found'; END IF;
 SELECT status INTO v_identity_status FROM public.identities WHERE id=p_identity;
 IF v_identity_status NOT IN ('ACTIVE','PENDING_INVITE') OR v_identity_status IS NULL THEN RAISE EXCEPTION 'Identity not eligible'; END IF;
 SELECT id INTO m FROM public.client_memberships WHERE identity_id=p_identity AND client_id=s.client_id AND status='ACTIVE';
 IF m IS NULL THEN RAISE EXCEPTION 'Membership is not active'; END IF;
 SELECT product_id,status INTO v_role_product,v_role_status FROM public.product_roles WHERE id=p_role;
 IF v_role_product IS DISTINCT FROM s.product_id OR v_role_status IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION 'Role not eligible for product'; END IF;
 IF s.status<>'ACTIVE' OR s.start_date>current_date OR (s.end_date IS NOT NULL AND current_date>s.end_date+s.grace_days) THEN RAISE EXCEPTION 'Subscription not active'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_product_access WHERE identity_id=p_identity AND subscription_id=p_subscription AND status IN ('ACTIVE','PENDING')) THEN RAISE EXCEPTION 'Product access already active or pending'; END IF;
 IF (SELECT count(*) FROM public.user_product_access WHERE subscription_id=p_subscription AND status IN ('ACTIVE','PENDING')) >=
   s.license_limit+coalesce((SELECT sum(extra_licenses) FROM public.license_overrides WHERE subscription_id=p_subscription),0)
 THEN RAISE EXCEPTION 'License limit reached'; END IF;
 INSERT INTO public.user_product_access(identity_id,subscription_id,product_role_id,membership_id,client_id,status)
 VALUES(p_identity,p_subscription,p_role,m,s.client_id,'PENDING') RETURNING id INTO v_id;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,client_id,product_id,source)
 VALUES(p_actor,'access.granted','user_product_access',v_id,s.client_id,s.product_id,'7service');
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.grant_product_access_atomic(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.grant_product_access_atomic(uuid,uuid,uuid,uuid) TO service_role;
