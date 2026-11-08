-- NOT APPLIED. Existing Supabase only; no changes to legacy grants.
-- Central suspension is immediate; remote revocation must be observed before
-- a final REVOKED state. Any unconfirmed remote operation stays reconcilable.
BEGIN;

ALTER TABLE public.provisioning_operations
  ADD COLUMN IF NOT EXISTS requested_role_status text
    CHECK (requested_role_status IS NULL OR requested_role_status IN ('SUSPENDED','REVOKED'));

CREATE OR REPLACE FUNCTION public.prepare_contract_role_revocation_atomic(
  p_actor uuid, p_assignment uuid, p_target_status text, p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v public.contract_role_assignments%ROWTYPE;
  v_request uuid := gen_random_uuid();
  v_remote_auth uuid;
  v_remote_company text;
  v_role_code text;
  v_product_code text;
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
  ) THEN RAISE EXCEPTION 'ACTOR_NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;
  IF p_target_status NOT IN ('SUSPENDED','REVOKED') OR
     length(trim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'INVALID_REVOCATION_REQUEST';
  END IF;

  SELECT * INTO v FROM public.contract_role_assignments
  WHERE id=p_assignment AND status IN ('ACTIVE','PENDING') FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROLE_NOT_ELIGIBLE_FOR_REVOCATION';
  END IF;

  SELECT a.remote_auth_user_id,b.remote_company_id,r.code,p.code
    INTO v_remote_auth,v_remote_company,v_role_code,v_product_code
  FROM public.destination_auth_links a
  JOIN public.environment_company_bindings b
    ON b.environment_id=a.environment_id AND b.client_id=v.company_id
  JOIN public.product_roles r ON r.id=v.role_id
  JOIN public.products p ON p.id=v.product_id
  WHERE a.environment_id=v.environment_id AND a.identity_id=v.identity_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DESTINATION_AUTH_OR_COMPANY_NOT_LINKED';
  END IF;

  -- Fail closed centrally immediately. Leave nominal seat reserved.
  UPDATE public.contract_role_assignments SET status='SUSPENDED',updated_at=now()
    WHERE id=p_assignment;

  INSERT INTO public.provisioning_operations(
    request_id,environment_id,identity_id,role_assignment_id,
    operation,status,requested_role_status
  ) VALUES(
    v_request,v.environment_id,v.identity_id,p_assignment,
    'REVOKE','RUNNING',p_target_status
  );

  INSERT INTO public.audit_logs(
    actor_internal_user_id,action,target_type,target_id,
    client_id,product_id,source,reason,metadata_safe
  ) VALUES (
    p_actor,'contract_role.revocation_requested','contract_role_assignment',
    p_assignment,v.company_id,v.product_id,'7service',trim(p_reason),
    jsonb_build_object('request_id',v_request,'requested_status',p_target_status,
      'central_status','SUSPENDED')
  );
  RETURN jsonb_build_object(
    'requestId',v_request,
    'centralIdentityId',v.identity_id,
    'remoteAuthUserId',v_remote_auth,
    'companyId',v.company_id,
    'remoteCompanyId',v_remote_company,
    'productCode',v_product_code,
    'roleCode',v_role_code,
    'action','REVOKE'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_contract_role_revocation_atomic(uuid,uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_contract_role_revocation_atomic(uuid,uuid,text,text)
 TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_contract_role_revocation_atomic(
  p_actor uuid,p_request uuid,p_remote_auth uuid,p_remote_company text,
  p_product_code text,p_revision text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_request public.provisioning_operations%ROWTYPE;
  v_assignment public.contract_role_assignments%ROWTYPE;
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
  ) THEN RAISE EXCEPTION 'ACTOR_NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;
  IF length(trim(coalesce(p_revision,''))) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION 'INVALID_REMOTE_REVISION';
  END IF;

  SELECT * INTO v_request FROM public.provisioning_operations
    WHERE request_id=p_request AND operation='REVOKE' AND status='RUNNING' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REVOCATION_NOT_RUNNING'; END IF;
  SELECT * INTO v_assignment FROM public.contract_role_assignments
    WHERE id=v_request.role_assignment_id AND status='SUSPENDED' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CENTRAL_ROLE_CHANGED'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.destination_auth_links a
    JOIN public.environment_company_bindings b
      ON b.environment_id=a.environment_id AND b.client_id=v_assignment.company_id
    JOIN public.products p ON p.id=v_assignment.product_id
    WHERE a.environment_id=v_assignment.environment_id
      AND a.identity_id=v_assignment.identity_id
      AND a.remote_auth_user_id=p_remote_auth
      AND b.remote_company_id=p_remote_company
      AND p.code=p_product_code
  ) THEN RAISE EXCEPTION 'REVOCATION_RECEIPT_MISMATCH' USING ERRCODE='42501'; END IF;

  UPDATE public.contract_role_assignments
    SET status=v_request.requested_role_status,updated_at=now()
    WHERE id=v_assignment.id;
  UPDATE public.provisioning_operations
    SET status='CONFIRMED',last_error_code=NULL,updated_at=now()
    WHERE request_id=p_request;
  INSERT INTO public.audit_logs(
    actor_internal_user_id,action,target_type,target_id,
    client_id,product_id,source,metadata_safe
  ) VALUES (
    p_actor,'contract_role.revocation_confirmed','contract_role_assignment',
    v_assignment.id,v_assignment.company_id,v_assignment.product_id,'7service',
    jsonb_build_object('request_id',p_request,'revision',p_revision,
      'status',v_request.requested_role_status)
  );
  -- Deliberately do not release seats here. Releasing requires a separate
  -- atomic verification of every legacy and current grant in the contract.
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_contract_role_revocation_atomic(
 uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_contract_role_revocation_atomic(
 uuid,uuid,uuid,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.request_contract_role_reactivation_atomic(
  p_actor uuid,p_assignment uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_id uuid;
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
  ) THEN RAISE EXCEPTION 'ACTOR_NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;

  -- A revocation readback is required before any attempt to restore access.
  UPDATE public.contract_role_assignments r
    SET status='PENDING',updated_at=now()
  WHERE r.id=p_assignment AND r.status='SUSPENDED'
    AND EXISTS (
      SELECT 1 FROM public.provisioning_operations op
      WHERE op.role_assignment_id=r.id AND op.operation='REVOKE'
        AND op.status='CONFIRMED'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.provisioning_operations op
      WHERE op.role_assignment_id=r.id AND op.operation='REVOKE'
        AND op.status IN ('PENDING','RUNNING','RECONCILIATION_REQUIRED')
    )
    AND EXISTS (
      SELECT 1 FROM public.contract_named_seats seat
      JOIN public.contract_seat_pools pool ON pool.contract_id=seat.contract_id
      WHERE seat.contract_id=r.contract_id AND seat.identity_id=r.identity_id
        AND seat.status IN ('ACTIVE','RESERVED') AND pool.enforcement_mode='ENFORCED'
    )
  RETURNING r.id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'REACTIVATION_NOT_ELIGIBLE' USING ERRCODE='42501'; END IF;
  INSERT INTO public.audit_logs(
    actor_internal_user_id,action,target_type,target_id,source,metadata_safe
  ) VALUES (
    p_actor,'contract_role.reactivation_requested','contract_role_assignment',v_id,
    '7service',jsonb_build_object('status','PENDING')
  );
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.request_contract_role_reactivation_atomic(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_contract_role_reactivation_atomic(uuid,uuid)
 TO service_role;
COMMIT;
