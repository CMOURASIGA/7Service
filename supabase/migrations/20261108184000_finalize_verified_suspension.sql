-- NOT APPLIED. This only finalizes already verified SUSPENDED profiles.
-- No seat is released automatically. Only a confirmed destination revoke
-- allows a suspended assignment to be converted into permanent REVOKED.
BEGIN;
CREATE OR REPLACE FUNCTION public.finalize_suspended_contract_role_atomic(
 p_actor uuid,p_assignment uuid,p_reason text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v public.contract_role_assignments%ROWTYPE;
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
 IF length(trim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 500 THEN
   RAISE EXCEPTION 'REASON_REQUIRED';
 END IF;
 SELECT * INTO v FROM public.contract_role_assignments
 WHERE id=p_assignment AND status='SUSPENDED' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ASSIGNMENT_NOT_SUSPENDED'; END IF;

 -- Require a completed remote revoke for this exact assignment and forbid
 -- any outstanding GRANT/REVOKE operations that could change remote access.
 IF NOT EXISTS (
   SELECT 1 FROM public.provisioning_operations op
   WHERE op.role_assignment_id=p_assignment AND op.operation='REVOKE'
     AND op.status='CONFIRMED'
 ) OR EXISTS (
   SELECT 1 FROM public.provisioning_operations op
   WHERE op.role_assignment_id=p_assignment AND op.operation IN ('GRANT','REVOKE')
     AND op.status IN ('PENDING','RUNNING','RECONCILIATION_REQUIRED')
 ) THEN
   RAISE EXCEPTION 'REMOTE_REVOCATION_NOT_VERIFIED' USING ERRCODE='42501';
 END IF;

 UPDATE public.contract_role_assignments
 SET status='REVOKED',updated_at=now() WHERE id=p_assignment;
 INSERT INTO public.audit_logs(
   actor_internal_user_id,action,target_type,target_id,client_id,product_id,
   source,reason,metadata_safe
 ) VALUES (
   p_actor,'contract_role.final_revocation','contract_role_assignment',
   p_assignment,v.company_id,v.product_id,'7service',trim(p_reason),
   jsonb_build_object('contract_id',v.contract_id,'environment_id',v.environment_id)
 );
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_suspended_contract_role_atomic(uuid,uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_suspended_contract_role_atomic(uuid,uuid,text)
 TO service_role;
COMMIT;
