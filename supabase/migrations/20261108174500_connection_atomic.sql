-- 7Service: auditable connection registration in the EXISTING database.
-- NOT APPLIED. Must follow the first additive migration and QA review.
BEGIN;
CREATE OR REPLACE FUNCTION public.register_environment_connection_atomic(
  p_actor uuid,
  p_environment uuid,
  p_project_url text,
  p_project_ref text,
  p_encrypted_admin_key text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_status text;
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF p_project_url <> 'https://' || p_project_ref || '.supabase.co'
     OR p_project_ref !~ '^[a-z0-9-]+$' OR length(p_encrypted_admin_key) < 60
     OR p_encrypted_admin_key NOT LIKE 'v1.%' THEN
    RAISE EXCEPTION 'INVALID_CONNECTION_PROPERTIES';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.internal_users u
    JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
    JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
    JOIN public.internal_permissions ip ON ip.id=rp.permission_id
    WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='clients.manage'
  ) THEN
    RAISE EXCEPTION 'OPERATOR_NOT_AUTHORIZED' USING ERRCODE='42501';
  END IF;
  SELECT status INTO v_status FROM public.product_environments WHERE id=p_environment FOR UPDATE;
  IF NOT FOUND OR v_status IN ('SUSPENDED','RETIRED') THEN
    RAISE EXCEPTION 'ENVIRONMENT_NOT_ELIGIBLE';
  END IF;

  INSERT INTO public.environment_connections(
    environment_id,project_url,project_ref,encrypted_admin_key,status,verified_at)
  VALUES (p_environment,p_project_url,p_project_ref,p_encrypted_admin_key,'VERIFIED',now())
  ON CONFLICT(environment_id) DO UPDATE
     SET project_url=EXCLUDED.project_url,
         project_ref=EXCLUDED.project_ref,
         encrypted_admin_key=EXCLUDED.encrypted_admin_key,
         status='VERIFIED',
         verified_at=now(),
         updated_at=now();

  INSERT INTO public.audit_logs(
    actor_internal_user_id,action,target_type,target_id,source,metadata_safe)
  VALUES(p_actor,'environment.connection_verified','product_environment',
         p_environment,'7service',
         jsonb_build_object('project_ref',p_project_ref,'result','VERIFIED'));
END;
$$;
REVOKE ALL ON FUNCTION public.register_environment_connection_atomic(uuid,uuid,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_environment_connection_atomic(uuid,uuid,text,text,text)
  TO service_role;
COMMIT;
