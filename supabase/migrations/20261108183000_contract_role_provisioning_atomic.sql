-- 7Service-only orchestration for remote profile enforcement.
-- NOT APPLIED. Requires all preceding additive provisioning migrations.
-- Destination RPCs must be deployed and tested separately in each product.
BEGIN;

ALTER TABLE public.provisioning_operations
 ADD COLUMN IF NOT EXISTS role_assignment_id uuid
 REFERENCES public.contract_role_assignments(id);

CREATE UNIQUE INDEX IF NOT EXISTS provisioning_one_pending_role_operation
 ON public.provisioning_operations(role_assignment_id,operation)
 WHERE operation IN ('GRANT','REVOKE')
 AND status IN ('PENDING','RUNNING','RECONCILIATION_REQUIRED');

CREATE OR REPLACE FUNCTION public.prepare_contract_role_provisioning_atomic(
 p_actor uuid, p_assignment uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v public.contract_role_assignments%ROWTYPE;
 v_request uuid := gen_random_uuid();
 v_client uuid;
 v_auth uuid;
 v_remote_company text;
 v_role_code text;
 v_product_code text;
BEGIN
 IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.internal_users u
  JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
  JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
  JOIN public.internal_permissions ip ON ip.id=rp.permission_id
  WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='users.access.manage'
 ) THEN RAISE EXCEPTION 'ACTOR_NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;
 SELECT * INTO v FROM public.contract_role_assignments
 WHERE id=p_assignment AND status='PENDING' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ROLE_ASSIGNMENT_NOT_PENDING'; END IF;
 IF EXISTS (
   SELECT 1 FROM public.provisioning_operations op
   WHERE op.role_assignment_id=p_assignment
     AND op.operation IN ('GRANT','REVOKE')
     AND op.status IN ('PENDING','RUNNING','RECONCILIATION_REQUIRED')
 ) THEN RAISE EXCEPTION 'DESTINATION_OPERATION_ALREADY_PENDING'; END IF;
 SELECT c.client_id INTO v_client FROM public.contracts c
 JOIN public.contract_seat_pools p ON p.contract_id=c.id
 WHERE c.id=v.contract_id AND c.status='ACTIVE'
  AND c.start_date<=current_date
  AND (c.end_date IS NULL OR c.end_date>=current_date)
  AND p.enforcement_mode='ENFORCED';
 IF NOT FOUND THEN RAISE EXCEPTION 'CONTRACT_NOT_ENFORCED' USING ERRCODE='42501'; END IF;

 IF NOT EXISTS(
  SELECT 1 FROM public.contract_named_seats
  WHERE contract_id=v.contract_id AND identity_id=v.identity_id
    AND status IN ('RESERVED','ACTIVE')
 ) OR NOT EXISTS(
  SELECT 1 FROM public.contract_product_entitlements
  WHERE contract_id=v.contract_id AND product_id=v.product_id
 ) OR NOT EXISTS(
  SELECT 1 FROM public.client_memberships m
  JOIN public.identities i ON i.id=m.identity_id
  WHERE m.identity_id=v.identity_id AND m.client_id=v.company_id
   AND m.status='ACTIVE' AND i.status='ACTIVE'
 ) THEN RAISE EXCEPTION 'CENTRAL_GRANT_NOT_EFFECTIVE' USING ERRCODE='42501'; END IF;

 IF v.company_id<>v_client AND NOT EXISTS (
  SELECT 1 FROM public.contract_seat_pools p
  JOIN public.customer_group_members m ON m.group_id=p.group_id
  WHERE p.contract_id=v.contract_id AND m.client_id=v.company_id AND m.status='ACTIVE'
 ) THEN RAISE EXCEPTION 'COMPANY_OUTSIDE_CONTRACT' USING ERRCODE='42501'; END IF;

 SELECT a.remote_auth_user_id, b.remote_company_id, r.code, p.code
 INTO v_auth,v_remote_company,v_role_code,v_product_code
 FROM public.product_environments pe
 JOIN public.product_deployments d ON d.id=pe.deployment_id
 JOIN public.client_deployments cd ON cd.deployment_id=d.id
 JOIN public.environment_connections ec ON ec.environment_id=pe.id
 JOIN public.environment_company_bindings b
   ON b.environment_id=pe.id AND b.client_id=v.company_id
 JOIN public.destination_auth_links a
   ON a.environment_id=pe.id AND a.identity_id=v.identity_id
 JOIN public.product_roles r ON r.id=v.role_id
 JOIN public.products p ON p.id=v.product_id
 WHERE pe.id=v.environment_id AND pe.status='ACTIVE'
  AND cd.client_id=v.company_id AND cd.product_id=v.product_id
  AND d.product_id=v.product_id AND ec.status='VERIFIED'
  AND r.product_id=v.product_id AND r.status='ACTIVE' AND p.status='ACTIVE';

 IF NOT FOUND THEN
  RAISE EXCEPTION 'DESTINATION_IDENTITY_OR_PROFILE_NOT_VERIFIED' USING ERRCODE='42501';
 END IF;

 INSERT INTO public.provisioning_operations(
  request_id,environment_id,identity_id,role_assignment_id,operation,status
 ) VALUES(v_request,v.environment_id,v.identity_id,p_assignment,'GRANT','RUNNING');

 INSERT INTO public.audit_logs(
   actor_internal_user_id,action,target_type,target_id,client_id,product_id,source,metadata_safe
 ) VALUES(p_actor,'contract_role.provisioning_prepared','provisioning_operation',
   v_request,v.company_id,v.product_id,'7service',
   jsonb_build_object('role_assignment_id',p_assignment,'environment_id',v.environment_id));

 RETURN jsonb_build_object(
  'requestId',v_request,
  'centralIdentityId',v.identity_id,
  'remoteAuthUserId',v_auth,
  'companyId',v.company_id,
  'remoteCompanyId',v_remote_company,
  'productCode',v_product_code,
  'roleCode',v_role_code,
  'action','GRANT'
 );
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_contract_role_provisioning_atomic(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_contract_role_provisioning_atomic(uuid,uuid)
 TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_contract_role_provisioning_atomic(
 p_actor uuid,p_request uuid,p_remote_auth uuid,p_remote_company text,
 p_product_code text,p_role_code text,p_revision text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_assignment uuid;v_env uuid;v_identity uuid;v_status text;v_company uuid;v_product uuid;
BEGIN
 IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.internal_users u
  JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
  JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
  JOIN public.internal_permissions ip ON ip.id=rp.permission_id
  WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='users.access.manage'
 ) THEN RAISE EXCEPTION 'ACTOR_NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;
 SELECT role_assignment_id,environment_id,identity_id,status
 INTO v_assignment,v_env,v_identity,v_status
 FROM public.provisioning_operations WHERE request_id=p_request AND operation='GRANT'
 FOR UPDATE;
 IF NOT FOUND OR v_status<>'RUNNING' THEN
   RAISE EXCEPTION 'PROFILE_OPERATION_NOT_RUNNING';
 END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.destination_auth_links a
  JOIN public.environment_company_bindings b ON b.environment_id=a.environment_id
  JOIN public.contract_role_assignments r ON r.id=v_assignment
  JOIN public.product_roles pr ON pr.id=r.role_id
  JOIN public.products p ON p.id=r.product_id
  JOIN public.contracts c ON c.id=r.contract_id
  JOIN public.contract_seat_pools pool ON pool.contract_id=c.id
  JOIN public.contract_named_seats seat
    ON seat.contract_id=c.id AND seat.identity_id=r.identity_id
  JOIN public.client_memberships m
    ON m.identity_id=r.identity_id AND m.client_id=r.company_id
  JOIN public.identities identity ON identity.id=r.identity_id
  JOIN public.contract_product_entitlements entitlement
    ON entitlement.contract_id=c.id AND entitlement.product_id=r.product_id
  JOIN public.product_environments pe ON pe.id=r.environment_id
  JOIN public.environment_connections conn ON conn.environment_id=pe.id
  WHERE a.environment_id=v_env AND a.identity_id=v_identity
   AND a.remote_auth_user_id=p_remote_auth
   AND b.environment_id=v_env AND b.client_id=r.company_id
   AND b.remote_company_id=p_remote_company
   AND pr.code=p_role_code AND p.code=p_product_code
   AND r.status='PENDING'
   AND c.status='ACTIVE' AND c.start_date<=current_date
   AND (c.end_date IS NULL OR c.end_date>=current_date)
   AND pool.enforcement_mode='ENFORCED'
   AND seat.status IN ('RESERVED','ACTIVE')
   AND m.status='ACTIVE' AND identity.status='ACTIVE'
   AND pe.status='ACTIVE' AND conn.status='VERIFIED'
 ) THEN RAISE EXCEPTION 'REMOTE_PROFILE_RECEIPT_MISMATCH' USING ERRCODE='42501'; END IF;
 IF length(trim(coalesce(p_revision,''))) NOT BETWEEN 8 AND 128 THEN
  RAISE EXCEPTION 'INVALID_REMOTE_REVISION';
 END IF;
 UPDATE public.contract_role_assignments SET status='ACTIVE',updated_at=now()
  WHERE id=v_assignment RETURNING company_id,product_id INTO v_company,v_product;
 UPDATE public.provisioning_operations SET status='CONFIRMED',updated_at=now(),
  last_error_code=NULL WHERE request_id=p_request;
 INSERT INTO public.audit_logs(
  actor_internal_user_id,action,target_type,target_id,client_id,product_id,source,metadata_safe
 ) VALUES(p_actor,'contract_role.provisioning_confirmed','contract_role_assignment',
  v_assignment,v_company,v_product,'7service',
  jsonb_build_object('request_id',p_request,'revision',p_revision,'result','CONFIRMED'));
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_contract_role_provisioning_atomic(
 uuid,uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_contract_role_provisioning_atomic(
 uuid,uuid,uuid,text,text,text,text) TO service_role;

COMMIT;
