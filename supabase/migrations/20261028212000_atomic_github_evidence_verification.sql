CREATE OR REPLACE FUNCTION public.verify_github_deployment_evidence(
 p_actor uuid,p_evidence uuid,p_expected_sha text,p_run_id text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_row public.deployment_evidence%ROWTYPE; v_id uuid;
BEGIN
 IF NOT EXISTS(
 SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
 JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
 JOIN public.internal_permissions ip ON ip.id=rp.permission_id
 WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='clients.manage'
 ) THEN RAISE EXCEPTION 'Unauthorized evidence verification'; END IF;
 SELECT * INTO v_row FROM public.deployment_evidence WHERE id=p_evidence FOR UPDATE;
 IF NOT FOUND OR v_row.provider <> 'GITHUB_ACTIONS' OR v_row.verification_state <> 'UNVERIFIED'
 THEN RAISE EXCEPTION 'Evidence not eligible for verification'; END IF;
 IF v_row.commit_sha <> lower(p_expected_sha) OR v_row.run_reference <> p_run_id
 THEN RAISE EXCEPTION 'Evidence identity mismatch'; END IF;
 UPDATE public.deployment_evidence SET verification_state='VERIFIED',
 verified_at=now(),verified_by=p_actor WHERE id=p_evidence;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,source,
 after_json) VALUES(p_actor,'deployment.evidence_verified','deployment_evidence',p_evidence,'7service',
 jsonb_build_object('sha',v_row.commit_sha,'run',p_run_id));
 RETURN p_evidence;
END $$;
REVOKE ALL ON FUNCTION public.verify_github_deployment_evidence(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_github_deployment_evidence(uuid,uuid,text,text) TO service_role;
