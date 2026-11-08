-- Stage a single effective role per identity/company/product/installation.
-- ADDITIVE and NOT APPLIED. Existing grants remain authoritative until migration.
BEGIN;

CREATE TABLE IF NOT EXISTS public.contract_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id),
  identity_id uuid NOT NULL REFERENCES public.identities(id),
  company_id uuid NOT NULL REFERENCES public.clients(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  environment_id uuid NOT NULL REFERENCES public.product_environments(id),
  role_id uuid NOT NULL REFERENCES public.product_roles(id),
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','REVOKED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS contract_role_assignments_one_effective_role
 ON public.contract_role_assignments(identity_id,company_id,product_id,environment_id)
 WHERE status IN ('PENDING','ACTIVE','SUSPENDED');
CREATE INDEX IF NOT EXISTS contract_role_assignments_contract_idx
 ON public.contract_role_assignments(contract_id,identity_id);
ALTER TABLE public.contract_role_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contract_role_assignments FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.contract_role_assignments TO service_role;

CREATE OR REPLACE FUNCTION public.assign_contract_role_atomic(
 p_actor uuid,
 p_contract uuid,
 p_identity uuid,
 p_company uuid,
 p_product uuid,
 p_environment uuid,
 p_role uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_result uuid; v_client uuid; v_group uuid; v_count integer; v_limit integer;
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

 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_contract::text,0));
 SELECT p.license_limit,c.client_id,p.group_id INTO v_limit,v_client,v_group
 FROM public.contract_seat_pools p JOIN public.contracts c ON c.id=p.contract_id
 WHERE p.contract_id=p_contract AND p.enforcement_mode='ENFORCED' FOR UPDATE OF p;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONTRACT_LICENSE_POOL_NOT_ACTIVE'; END IF;

 IF v_client<>p_company AND (
   v_group IS NULL OR NOT EXISTS(
     SELECT 1 FROM public.customer_group_members
      WHERE group_id=v_group AND client_id=p_company AND status='ACTIVE'
   )
 ) THEN RAISE EXCEPTION 'COMPANY_OUTSIDE_CONTRACT' USING ERRCODE='42501'; END IF;

 IF NOT EXISTS(
   SELECT 1 FROM public.client_memberships m JOIN public.identities i ON i.id=m.identity_id
   WHERE m.identity_id=p_identity AND m.client_id=p_company AND m.status='ACTIVE'
     AND i.status IN ('ACTIVE','PENDING_INVITE')
 ) THEN RAISE EXCEPTION 'IDENTITY_NOT_MEMBER' USING ERRCODE='42501'; END IF;

 IF NOT EXISTS(
   SELECT 1 FROM public.contract_product_entitlements
   WHERE contract_id=p_contract AND product_id=p_product
 ) OR NOT EXISTS(
   SELECT 1 FROM public.product_roles
   WHERE id=p_role AND product_id=p_product AND status='ACTIVE'
 ) THEN RAISE EXCEPTION 'INVALID_PRODUCT_OR_ROLE' USING ERRCODE='42501'; END IF;

 IF NOT EXISTS(
   SELECT 1 FROM public.environment_company_bindings cb
   JOIN public.product_environments pe ON pe.id=cb.environment_id
   JOIN public.product_deployments d ON d.id=pe.deployment_id
   JOIN public.environment_connections ec ON ec.environment_id=pe.id
   WHERE cb.environment_id=p_environment AND cb.client_id=p_company
    AND d.product_id=p_product AND pe.status='ACTIVE' AND ec.status='VERIFIED'
 ) THEN RAISE EXCEPTION 'ENVIRONMENT_NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;

 -- Reuse a seat for the same identity across any product or company.
 IF NOT EXISTS(
   SELECT 1 FROM public.contract_named_seats
   WHERE contract_id=p_contract AND identity_id=p_identity AND status IN ('RESERVED','ACTIVE')
 ) THEN
   SELECT count(*) INTO v_count FROM public.contract_named_seats
   WHERE contract_id=p_contract AND status IN ('RESERVED','ACTIVE');
   IF v_count>=v_limit THEN
     RAISE EXCEPTION 'CONTRACT_LICENSE_LIMIT_REACHED' USING ERRCODE='23514';
   END IF;
   INSERT INTO public.contract_named_seats(contract_id,identity_id,status)
   VALUES(p_contract,p_identity,'RESERVED')
   ON CONFLICT(contract_id,identity_id)
   DO UPDATE SET status='RESERVED',updated_at=now();
 END IF;

 -- A role change is not a new license: update in place and preserve audit.
 SELECT id INTO v_result FROM public.contract_role_assignments
 WHERE identity_id=p_identity AND company_id=p_company
   AND product_id=p_product AND environment_id=p_environment
   AND status IN ('PENDING','ACTIVE','SUSPENDED') FOR UPDATE;
 IF v_result IS NOT NULL THEN
   UPDATE public.contract_role_assignments
   SET role_id=p_role,status='PENDING',updated_at=now()
   WHERE id=v_result;
 ELSE
   INSERT INTO public.contract_role_assignments(
     contract_id,identity_id,company_id,product_id,environment_id,role_id,status
   ) VALUES(p_contract,p_identity,p_company,p_product,p_environment,p_role,'PENDING')
   RETURNING id INTO v_result;
 END IF;

 INSERT INTO public.audit_logs(
   actor_internal_user_id,action,target_type,target_id,client_id,product_id,source,metadata_safe
 ) VALUES(p_actor,'contract_role.assignment_requested','contract_role_assignment',
   v_result,p_company,p_product,'7service',
   jsonb_build_object('contract_id',p_contract,'environment_id',p_environment,
                      'role_id',p_role,'state','PENDING'));
 RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_contract_role_atomic(uuid,uuid,uuid,uuid,uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assign_contract_role_atomic(uuid,uuid,uuid,uuid,uuid,uuid,uuid)
 TO service_role;
COMMIT;
