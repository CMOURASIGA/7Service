CREATE OR REPLACE FUNCTION public.record_deployment_version_atomic(
 p_actor_id uuid,p_environment_id uuid,p_sha text,p_status text,p_notes text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF NOT EXISTS(
 SELECT 1 FROM public.internal_users u
 JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
 JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
 JOIN public.internal_permissions ip ON ip.id=rp.permission_id
 WHERE u.id=p_actor_id AND u.status='ACTIVE' AND ip.code='clients.manage'
 ) THEN RAISE EXCEPTION 'Unauthorized version reporting'; END IF;
 IF p_sha !~ '^[a-fA-F0-9]{40}$' OR p_status NOT IN ('PENDING','SUCCESS','FAILED','ROLLED_BACK')
 THEN RAISE EXCEPTION 'Invalid version report'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.product_environments WHERE id=p_environment_id)
 THEN RAISE EXCEPTION 'Environment not found'; END IF;
 INSERT INTO public.deployment_versions(environment_id,commit_sha,status,notes,actor_id)
 VALUES(p_environment_id,lower(p_sha),p_status,NULLIF(p_notes,''),p_actor_id)
 RETURNING id INTO v_id;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,reason,after_json,source)
 VALUES(p_actor_id,'deployment.version_reported','deployment_version',v_id,NULLIF(p_notes,''),
 jsonb_build_object('commitSha',lower(p_sha),'reportedStatus',p_status),'7service');
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.record_deployment_version_atomic(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_deployment_version_atomic(uuid,uuid,text,text,text) TO service_role;
