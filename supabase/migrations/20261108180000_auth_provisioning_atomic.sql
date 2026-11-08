-- 7Service provisioning transaction boundary. NOT APPLIED.
-- The administrative user is checked again in the server route.
-- Remote Auth interaction is never performed inside a database transaction.
BEGIN;

ALTER TABLE public.provisioning_operations
  ADD COLUMN IF NOT EXISTS access_id uuid REFERENCES public.user_product_access(id);
CREATE UNIQUE INDEX IF NOT EXISTS provisioning_one_pending_invite
  ON public.provisioning_operations(environment_id,identity_id,operation)
  WHERE operation='INVITE' AND status IN ('PENDING','RUNNING');

CREATE OR REPLACE FUNCTION public.prepare_destination_invitation_atomic(
  p_actor uuid, p_access uuid, p_environment uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_request uuid := gen_random_uuid();
 v_identity uuid;
 v_client uuid;
 v_product uuid;
 v_contract uuid;
 v_deployment uuid;
BEGIN
 IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.internal_users WHERE id=p_actor AND status='ACTIVE') THEN
   RAISE EXCEPTION 'ACTOR_NOT_ALLOWED' USING ERRCODE='42501';
 END IF;
 SELECT a.identity_id,a.client_id,s.product_id,s.contract_id
   INTO v_identity,v_client,v_product,v_contract
   FROM public.user_product_access a
   JOIN public.subscriptions s ON s.id=a.subscription_id
   JOIN public.identities i ON i.id=a.identity_id
   JOIN public.client_memberships m ON m.id=a.membership_id
   WHERE a.id=p_access AND a.status='ACTIVE'
     AND i.status='ACTIVE' AND m.status='ACTIVE' AND s.status='ACTIVE'
     AND m.client_id=a.client_id AND m.identity_id=a.identity_id
   FOR UPDATE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'NO_EFFECTIVE_CENTRAL_GRANT' USING ERRCODE='42501'; END IF;

 SELECT pe.deployment_id INTO v_deployment
   FROM public.product_environments pe
   JOIN public.product_deployments pd ON pd.id=pe.deployment_id
   JOIN public.client_deployments cd ON cd.deployment_id=pd.id
   JOIN public.environment_connections ec ON ec.environment_id=pe.id
   JOIN public.environment_company_bindings cb
     ON cb.environment_id=pe.id AND cb.client_id=v_client
   WHERE pe.id=p_environment AND pe.status='ACTIVE'
     AND pd.product_id=v_product AND cd.product_id=v_product
     AND cd.client_id=v_client AND ec.status='VERIFIED';
 IF NOT FOUND THEN
   RAISE EXCEPTION 'DESTINATION_NOT_VERIFIED_FOR_TENANT' USING ERRCODE='42501';
 END IF;

 IF NOT EXISTS(
   SELECT 1 FROM public.contract_seat_pools p
   JOIN public.contract_named_seats cs ON cs.contract_id=p.contract_id
   JOIN public.contract_product_entitlements cp ON cp.contract_id=p.contract_id
   WHERE p.contract_id=v_contract AND p.enforcement_mode='ENFORCED'
    AND cs.identity_id=v_identity AND cs.status IN ('RESERVED','ACTIVE')
    AND cp.product_id=v_product
 ) THEN
   RAISE EXCEPTION 'CONTRACT_SEAT_NOT_ACTIVE' USING ERRCODE='42501';
 END IF;
 IF EXISTS(SELECT 1 FROM public.destination_auth_links
   WHERE environment_id=p_environment AND identity_id=v_identity) THEN
   RAISE EXCEPTION 'LOCAL_ACCOUNT_ALREADY_LINKED';
 END IF;

 INSERT INTO public.provisioning_operations(
   request_id,environment_id,identity_id,access_id,operation,status)
 VALUES(v_request,p_environment,v_identity,p_access,'INVITE','PENDING');

 INSERT INTO public.audit_logs(
   actor_internal_user_id,action,target_type,target_id,client_id,source,metadata_safe)
 VALUES(p_actor,'provisioning.invite_prepared','provisioning_operation',v_request,
   v_client,'7service',jsonb_build_object('environment_id',p_environment,'product_id',v_product));
 RETURN v_request;
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_destination_invitation_atomic(uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_destination_invitation_atomic(uuid,uuid,uuid)
 TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_destination_invitation_atomic(
  p_actor uuid,p_request uuid,p_remote_auth_user uuid,p_remote_email text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_env uuid;v_identity uuid;v_status text;
BEGIN
 IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.internal_users WHERE id=p_actor AND status='ACTIVE') THEN
   RAISE EXCEPTION 'ACTOR_NOT_ALLOWED' USING ERRCODE='42501';
 END IF;
 SELECT environment_id,identity_id,status INTO v_env,v_identity,v_status
  FROM public.provisioning_operations WHERE request_id=p_request AND operation='INVITE'
  FOR UPDATE;
 IF NOT FOUND OR v_status<>'PENDING' THEN RAISE EXCEPTION 'OPERATION_NOT_PENDING'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.identities
   WHERE id=v_identity AND lower(email)=lower(p_remote_email)) THEN
   RAISE EXCEPTION 'REMOTE_EMAIL_MISMATCH';
 END IF;
 INSERT INTO public.destination_auth_links(
   environment_id,identity_id,remote_auth_user_id,remote_email)
 VALUES(v_env,v_identity,p_remote_auth_user,lower(p_remote_email));
 UPDATE public.provisioning_operations
   SET status='RECONCILIATION_REQUIRED',updated_at=now()
   WHERE request_id=p_request;
 INSERT INTO public.audit_logs(
   actor_internal_user_id,action,target_type,target_id,source,metadata_safe)
 VALUES(p_actor,'provisioning.auth_account_linked','provisioning_operation',p_request,
  '7service',jsonb_build_object('environment_id',v_env,'result','AWAITING_PRODUCT_PROFILE'));
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_destination_invitation_atomic(uuid,uuid,uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_destination_invitation_atomic(uuid,uuid,uuid,text)
 TO service_role;
COMMIT;
