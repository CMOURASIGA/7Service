CREATE OR REPLACE FUNCTION public.verify_vercel_deployment_evidence(
 p_actor uuid,p_evidence uuid,p_sha text,p_deployment_id text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v public.deployment_evidence%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.internal_users u
 JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
 JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
 JOIN public.internal_permissions ip ON ip.id=rp.permission_id
 WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='clients.manage')
 THEN RAISE EXCEPTION 'Unauthorized evidence verification'; END IF;
 SELECT * INTO v FROM public.deployment_evidence WHERE id=p_evidence FOR UPDATE;
 IF NOT FOUND OR v.provider<>'VERCEL' OR v.verification_state<>'UNVERIFIED'
 THEN RAISE EXCEPTION 'Evidence not eligible'; END IF;
 IF v.commit_sha<>lower(p_sha) OR v.run_reference<>p_deployment_id
 THEN RAISE EXCEPTION 'Evidence mismatch'; END IF;
 UPDATE public.deployment_evidence SET verification_state='VERIFIED',
 verified_by=p_actor,verified_at=now() WHERE id=p_evidence;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,source,after_json)
 VALUES(p_actor,'deployment.vercel_evidence_verified','deployment_evidence',p_evidence,
 '7service',jsonb_build_object('sha',v.commit_sha,'deploymentId',p_deployment_id));
 RETURN p_evidence;
END $$;
REVOKE ALL ON FUNCTION public.verify_vercel_deployment_evidence(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_vercel_deployment_evidence(uuid,uuid,text,text) TO service_role;
