-- Status transitions for remote Auth provisioning failures.
-- NOT APPLIED; requires central provisioning base migrations.
BEGIN;
CREATE OR REPLACE FUNCTION public.mark_provisioning_reconciliation_atomic(
  p_actor uuid, p_request uuid, p_reason text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_env uuid;
  v_identity uuid;
  v_status text;
  v_attempts integer;
BEGIN
  IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.internal_users u
    JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
    JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
    JOIN public.internal_permissions ip ON ip.id=rp.permission_id
    WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='users.access.manage'
  ) THEN
    RAISE EXCEPTION 'ACTOR_NOT_AUTHORIZED' USING ERRCODE='42501';
  END IF;
  IF p_reason NOT IN (
    'DESTINATION_AUTH_RESPONSE_UNKNOWN',
    'DESTINATION_AUTH_ACCOUNT_LINK_UNCONFIRMED',
    'DESTINATION_METADATA_UNAVAILABLE',
    'DESTINATION_PROFILE_UNVERIFIED'
  ) THEN RAISE EXCEPTION 'INVALID_FAILURE_CLASSIFICATION'; END IF;

  SELECT environment_id,identity_id,status,attempts
    INTO v_env,v_identity,v_status,v_attempts
    FROM public.provisioning_operations WHERE request_id=p_request
    FOR UPDATE;
  IF NOT FOUND OR v_status NOT IN ('PENDING','RUNNING','RECONCILIATION_REQUIRED') THEN
    RAISE EXCEPTION 'OPERATION_NOT_RECONCILABLE';
  END IF;

  UPDATE public.provisioning_operations
    SET status='RECONCILIATION_REQUIRED',last_error_code=p_reason,
        attempts=v_attempts+1,updated_at=now()
    WHERE request_id=p_request;

  INSERT INTO public.audit_logs(
    actor_internal_user_id,action,target_type,target_id,source,metadata_safe
  ) VALUES (
    p_actor,'provisioning.reconciliation_requested','provisioning_operation',p_request,
    '7service',jsonb_build_object('reason',p_reason,'environment_id',v_env,
                                  'identity_id',v_identity)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.mark_provisioning_reconciliation_atomic(uuid,uuid,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mark_provisioning_reconciliation_atomic(uuid,uuid,text)
  TO service_role;
COMMIT;
