-- 7Service: service-role-only atomic seat reservation.
-- Apply ONLY AFTER reviewing 20261108173500_central_provisioning_additive.sql
-- and verifying the migration on develop/homologation. NOT APPLIED.
BEGIN;

CREATE OR REPLACE FUNCTION public.reserve_contract_named_seat_atomic(
  p_contract_id uuid, p_identity_id uuid, p_client_id uuid, p_product_id uuid
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit integer;
  v_mode text;
  v_owner uuid;
  v_group uuid;
  v_total integer;
  v_current text;
BEGIN
  -- Never allow a public API caller to bypass the authenticated server flow.
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE = '42501';
  END IF;
  -- Acquire a transaction-scoped lock per contract, preventing overbooking.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_contract_id::text, 0));
  SELECT p.license_limit, p.enforcement_mode, c.client_id, p.group_id
    INTO v_limit, v_mode, v_owner, v_group
    FROM public.contract_seat_pools p JOIN public.contracts c ON c.id=p.contract_id
   WHERE p.contract_id=p_contract_id
   FOR UPDATE OF p;
  IF NOT FOUND OR v_mode <> 'ENFORCED' THEN
    RAISE EXCEPTION 'NAMED_SEATS_NOT_ENABLED';
  END IF;

  -- Explicit product entitlement, not implicit access from seat ownership.
  IF NOT EXISTS (SELECT 1 FROM public.contract_product_entitlements
                 WHERE contract_id=p_contract_id AND product_id=p_product_id) THEN
    RAISE EXCEPTION 'PRODUCT_OUTSIDE_CONTRACT' USING ERRCODE = '42501';
  END IF;

  -- The requested company must be the contracting client or an active member
  -- of the contracting group; no cross-tenant enrollment.
  IF p_client_id <> v_owner AND (
       v_group IS NULL OR NOT EXISTS (
          SELECT 1 FROM public.customer_group_members
          WHERE group_id=v_group AND client_id=p_client_id AND status='ACTIVE'
       )
     ) THEN
    RAISE EXCEPTION 'COMPANY_OUTSIDE_CONTRACT' USING ERRCODE = '42501';
  END IF;

  -- Identity must have an existing ACTIVE membership for the company.
  IF NOT EXISTS (
    SELECT 1 FROM public.client_memberships
     WHERE identity_id=p_identity_id AND client_id=p_client_id AND status='ACTIVE'
  ) THEN
    RAISE EXCEPTION 'MEMBERSHIP_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO v_current FROM public.contract_named_seats
   WHERE contract_id=p_contract_id AND identity_id=p_identity_id FOR UPDATE;

  IF v_current IN ('RESERVED','ACTIVE') THEN
    RETURN 'ALREADY_LICENSED';
  END IF;

  SELECT count(*) INTO v_total FROM public.contract_named_seats
   WHERE contract_id=p_contract_id AND status IN ('RESERVED','ACTIVE');
  IF v_total >= v_limit THEN
    RAISE EXCEPTION 'CONTRACT_LICENSE_LIMIT_REACHED' USING ERRCODE='23514';
  END IF;

  INSERT INTO public.contract_named_seats(contract_id, identity_id, status)
    VALUES(p_contract_id,p_identity_id,'RESERVED')
  ON CONFLICT(contract_id,identity_id)
  DO UPDATE SET status='RESERVED', updated_at=now();
  RETURN 'RESERVED';
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_contract_named_seat_atomic(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_contract_named_seat_atomic(uuid,uuid,uuid,uuid) TO service_role;

-- Explicit release requires all grants to have been revoked and requires
-- same transaction lock as reservation. Suspended grants hold their seat.
CREATE OR REPLACE FUNCTION public.release_contract_named_seat_atomic(
  p_contract_id uuid, p_identity_id uuid
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_active integer;
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_contract_id::text,0));
  SELECT count(*) INTO v_active
  FROM public.user_product_access a
  JOIN public.subscriptions s ON s.id=a.subscription_id
  WHERE s.contract_id=p_contract_id AND a.identity_id=p_identity_id
    AND a.status IN ('PENDING','ACTIVE','SUSPENDED');
  IF v_active > 0 THEN
    RAISE EXCEPTION 'ACTIVE_GRANTS_STILL_EXIST';
  END IF;
  UPDATE public.contract_named_seats SET status='RELEASED',updated_at=now()
   WHERE contract_id=p_contract_id AND identity_id=p_identity_id;
  RETURN 'RELEASED';
END;
$$;
REVOKE ALL ON FUNCTION public.release_contract_named_seat_atomic(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_contract_named_seat_atomic(uuid,uuid) TO service_role;
COMMIT;
