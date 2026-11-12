-- Existing 7Service database ONLY. NOT APPLIED.
-- Backfill named contract seats in SHADOW mode and opt into ENFORCED only after
-- legacy grants are reconciled. No user, grant or subscription is deleted.
BEGIN;

CREATE OR REPLACE FUNCTION public.reconcile_contract_named_seats_atomic(
  p_actor uuid, p_contract uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_limit integer;
  v_mode text;
  v_legacy integer;
  v_occupied integer;
  v_missing integer;
  v_entitlement_missing integer;
  v_company_missing integer;
  v_role_conflicts integer;
BEGIN
  IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.internal_users u
    JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
    JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
    JOIN public.internal_permissions ip ON ip.id=rp.permission_id
    WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='contracts.manage'
  ) THEN RAISE EXCEPTION 'ACTOR_NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_contract::text,0));
  SELECT license_limit,enforcement_mode INTO v_limit,v_mode
   FROM public.contract_seat_pools WHERE contract_id=p_contract FOR UPDATE;
  IF NOT FOUND OR v_mode <> 'SHADOW' THEN
    RAISE EXCEPTION 'CONTRACT_SHADOW_REQUIRED';
  END IF;

  SELECT count(DISTINCT a.identity_id) INTO v_legacy
    FROM public.user_product_access a
    JOIN public.subscriptions s ON s.id=a.subscription_id
   WHERE s.contract_id=p_contract AND a.status IN ('ACTIVE','PENDING','SUSPENDED');

  -- The pool covers all current and historical paths, not only legacy grants.
  IF (
    SELECT count(*) FROM (
      SELECT a.identity_id FROM public.user_product_access a
      JOIN public.subscriptions s ON s.id=a.subscription_id
      WHERE s.contract_id=p_contract AND a.status IN ('ACTIVE','PENDING','SUSPENDED')
      UNION
      SELECT r.identity_id FROM public.contract_role_assignments r
      WHERE r.contract_id=p_contract AND r.status IN ('ACTIVE','PENDING','SUSPENDED')
    ) occupied_identity
  ) > v_limit THEN
    RAISE EXCEPTION 'CONTRACT_OVER_NOMINAL_SEAT_LIMIT';
  END IF;

  -- Never force a released seat back into use before the license count check.
  -- Reserve seats for both legacy grants and new role assignments.
  -- The UNION is distinct by identity, so one person uses one contract seat.
  INSERT INTO public.contract_named_seats(contract_id,identity_id,status)
  SELECT p_contract,occupied.identity_id,'RESERVED'
    FROM (
      SELECT a.identity_id
        FROM public.user_product_access a
        JOIN public.subscriptions s ON s.id=a.subscription_id
       WHERE s.contract_id=p_contract AND a.status IN ('ACTIVE','PENDING','SUSPENDED')
      UNION
      SELECT r.identity_id
        FROM public.contract_role_assignments r
       WHERE r.contract_id=p_contract AND r.status IN ('ACTIVE','PENDING','SUSPENDED')
    ) occupied
  ON CONFLICT(contract_id,identity_id) DO UPDATE
    SET status='RESERVED',updated_at=now()
    WHERE public.contract_named_seats.status='RELEASED';

  -- Avoid leaving a historical seat marked active without a central grant.
  UPDATE public.contract_named_seats named
     SET status='RELEASED',updated_at=now()
   WHERE named.contract_id=p_contract
     AND named.status IN ('RESERVED','ACTIVE')
     AND NOT EXISTS(
       SELECT 1 FROM public.user_product_access a
       JOIN public.subscriptions s ON s.id=a.subscription_id
       WHERE s.contract_id=p_contract AND a.identity_id=named.identity_id
         AND a.status IN ('ACTIVE','PENDING','SUSPENDED')
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.contract_role_assignments r
       WHERE r.contract_id=p_contract AND r.identity_id=named.identity_id
         AND r.status IN ('ACTIVE','PENDING','SUSPENDED')
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.provisioning_operations op
       JOIN public.contract_role_assignments r ON r.id=op.role_assignment_id
       WHERE r.contract_id=p_contract AND r.identity_id=named.identity_id
         AND op.status IN ('PENDING','RUNNING','RECONCILIATION_REQUIRED')
     );

  SELECT count(*) INTO v_occupied
    FROM public.contract_named_seats
   WHERE contract_id=p_contract AND status IN ('RESERVED','ACTIVE');

  SELECT count(*) INTO v_entitlement_missing
    FROM public.user_product_access a
    JOIN public.subscriptions s ON s.id=a.subscription_id
   WHERE s.contract_id=p_contract
     AND a.status IN ('ACTIVE','PENDING','SUSPENDED')
     AND NOT EXISTS(
       SELECT 1 FROM public.contract_product_entitlements e
       WHERE e.contract_id=p_contract AND e.product_id=s.product_id
     );

  SELECT count(*) INTO v_company_missing
    FROM public.user_product_access a
    JOIN public.subscriptions s ON s.id=a.subscription_id
    JOIN public.contracts c ON c.id=s.contract_id
    JOIN public.contract_seat_pools p ON p.contract_id=s.contract_id
   WHERE s.contract_id=p_contract
     AND a.status IN ('ACTIVE','PENDING','SUSPENDED')
     AND a.client_id<>c.client_id
     AND (p.group_id IS NULL OR NOT EXISTS(
       SELECT 1 FROM public.customer_group_members m
        WHERE m.group_id=p.group_id AND m.client_id=a.client_id AND m.status='ACTIVE'
     ));

  -- Legacy records can carry multiple active roles for the same person,
  -- company and product. Do not silently choose one during migration.
  SELECT count(*) INTO v_role_conflicts
    FROM (
      SELECT a.identity_id,a.client_id,s.product_id
      FROM public.user_product_access a
      JOIN public.subscriptions s ON s.id=a.subscription_id
      WHERE s.contract_id=p_contract
        AND a.status IN ('ACTIVE','PENDING','SUSPENDED')
      GROUP BY a.identity_id,a.client_id,s.product_id
      HAVING count(DISTINCT a.product_role_id)>1 OR count(*)>1
    ) collisions;

  SELECT count(*) INTO v_missing
    FROM public.user_product_access a
    JOIN public.subscriptions s ON s.id=a.subscription_id
    LEFT JOIN public.contract_named_seats n
      ON n.contract_id=s.contract_id AND n.identity_id=a.identity_id
      AND n.status IN ('RESERVED','ACTIVE')
   WHERE s.contract_id=p_contract
     AND a.status IN ('ACTIVE','PENDING','SUSPENDED')
     AND n.identity_id IS NULL;

  INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,
                                 source,metadata_safe)
  VALUES(p_actor,'contract.named_seats_reconciled','contract',p_contract,'7service',
    jsonb_build_object('legacy_users',v_legacy,'occupied',v_occupied,'limit',v_limit,
      'missing_seats',v_missing,'missing_products',v_entitlement_missing,
      'companies_outside_contract',v_company_missing,
      'legacy_role_conflicts',v_role_conflicts,'mode','SHADOW'));

  RETURN jsonb_build_object('legacy_users',v_legacy,'occupied',v_occupied,'limit',v_limit,
    'missing_seats',v_missing,'missing_products',v_entitlement_missing,
    'companies_outside_contract',v_company_missing,
    'legacy_role_conflicts',v_role_conflicts,
    'ready',v_missing=0 AND v_entitlement_missing=0
       AND v_company_missing=0 AND v_role_conflicts=0 AND v_occupied<=v_limit);
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_contract_named_seats_atomic(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_contract_named_seats_atomic(uuid,uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.activate_contract_named_seats_atomic(
  p_actor uuid, p_contract uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_result jsonb;
 v_limit integer;
 v_occupied integer;
 v_active_grants integer;
 v_missing_installations integer;
 v_unmapped_auth integer;
 v_unresolved_operations integer;
BEGIN
 IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(
   SELECT 1 FROM public.internal_users u
   JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
   JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
   JOIN public.internal_permissions ip ON ip.id=rp.permission_id
   WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='contracts.manage'
 ) THEN RAISE EXCEPTION 'ACTOR_NOT_AUTHORIZED' USING ERRCODE='42501'; END IF;

 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_contract::text,0));
 SELECT license_limit INTO v_limit FROM public.contract_seat_pools
   WHERE contract_id=p_contract AND enforcement_mode='SHADOW' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONTRACT_SHADOW_REQUIRED'; END IF;

 -- Reconciliation is intentionally performed in the same transaction as activation.
 v_result:=public.reconcile_contract_named_seats_atomic(p_actor,p_contract);
 IF (v_result->>'ready')::boolean IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'RECONCILIATION_NOT_READY';
 END IF;

 SELECT count(*) INTO v_active_grants
 FROM public.user_product_access a
 JOIN public.subscriptions s ON s.id=a.subscription_id
 WHERE s.contract_id=p_contract AND a.status IN ('ACTIVE','PENDING','SUSPENDED');

 -- Do not activate a contract whose legacy company/product grants cannot be
 -- resolved to existing verified installations and mappings.
 SELECT count(*) INTO v_missing_installations
 FROM public.user_product_access a
 JOIN public.subscriptions s ON s.id=a.subscription_id
 WHERE s.contract_id=p_contract
   AND a.status IN ('ACTIVE','PENDING','SUSPENDED')
   AND NOT EXISTS(
     SELECT 1 FROM public.environment_company_bindings cb
     JOIN public.product_environments pe ON pe.id=cb.environment_id
     JOIN public.product_deployments pd ON pd.id=pe.deployment_id
     JOIN public.client_deployments cd ON cd.deployment_id=pd.id
     JOIN public.environment_connections ec ON ec.environment_id=pe.id
     WHERE cb.client_id=a.client_id AND pd.product_id=s.product_id
       AND cd.client_id=a.client_id AND cd.product_id=s.product_id
       AND pe.status='ACTIVE' AND ec.status='VERIFIED'
   );
 IF v_missing_installations>0 THEN
   RAISE EXCEPTION 'UNMAPPED_LEGACY_INSTALLATIONS: %',v_missing_installations;
 END IF;

 -- Verified deployment alone is insufficient. Every effective legacy identity
 -- must already have a destination Auth mapping in an eligible installation.
 -- Do not switch to ENFORCED while the original product remains unmapped.
 SELECT count(*) INTO v_unmapped_auth
 FROM public.user_product_access a
 JOIN public.subscriptions s ON s.id=a.subscription_id
 WHERE s.contract_id=p_contract
   AND a.status IN ('ACTIVE','PENDING','SUSPENDED')
   AND NOT EXISTS(
     SELECT 1 FROM public.destination_auth_links auth_link
     JOIN public.environment_company_bindings cb
       ON cb.environment_id=auth_link.environment_id
     JOIN public.product_environments pe ON pe.id=cb.environment_id
     JOIN public.product_deployments pd ON pd.id=pe.deployment_id
     JOIN public.client_deployments cd ON cd.deployment_id=pd.id
     JOIN public.environment_connections ec ON ec.environment_id=pe.id
     WHERE auth_link.identity_id=a.identity_id
       AND cb.client_id=a.client_id
       AND pd.product_id=s.product_id
       AND cd.client_id=a.client_id AND cd.product_id=s.product_id
       AND pe.status='ACTIVE' AND ec.status='VERIFIED'
   );
 IF v_unmapped_auth>0 THEN
   RAISE EXCEPTION 'LEGACY_REMOTE_IDENTITIES_NOT_MAPPED: %',v_unmapped_auth;
 END IF;

 -- Unfinished work in the destination cannot be assumed successful.
 SELECT count(*) INTO v_unresolved_operations
 FROM public.provisioning_operations op
 WHERE op.status IN ('PENDING','RUNNING','RECONCILIATION_REQUIRED')
   AND (
     EXISTS (
       SELECT 1 FROM public.contract_role_assignments ra
       WHERE ra.id=op.role_assignment_id AND ra.contract_id=p_contract
     )
     OR EXISTS (
       SELECT 1 FROM public.user_product_access a
       JOIN public.subscriptions s ON s.id=a.subscription_id
       WHERE s.contract_id=p_contract AND a.identity_id=op.identity_id
         AND a.status IN ('PENDING','ACTIVE','SUSPENDED')
     )
   );
 IF v_unresolved_operations>0 THEN
   RAISE EXCEPTION 'DESTINATION_OPERATIONS_UNRESOLVED: %',v_unresolved_operations;
 END IF;

 SELECT count(*) INTO v_occupied
 FROM public.contract_named_seats
 WHERE contract_id=p_contract AND status IN ('RESERVED','ACTIVE');
 IF v_occupied>v_limit THEN
   RAISE EXCEPTION 'LICENSE_LIMIT_EXCEEDED';
 END IF;

 UPDATE public.contract_seat_pools
   SET enforcement_mode='ENFORCED',updated_at=now()
 WHERE contract_id=p_contract;

 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,
                                source,metadata_safe)
 VALUES(p_actor,'contract.named_seats_activated','contract',p_contract,'7service',
        jsonb_build_object('active_grants',v_active_grants,'occupied',v_occupied,
                           'limit',v_limit,'mode','ENFORCED'));
END;
$$;
REVOKE ALL ON FUNCTION public.activate_contract_named_seats_atomic(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.activate_contract_named_seats_atomic(uuid,uuid)
  TO service_role;
COMMIT;
