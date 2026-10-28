CREATE OR REPLACE FUNCTION public.enforce_access_license_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_sub public.subscriptions%ROWTYPE; v_role_product uuid; v_member record; v_used integer; v_extra integer;
BEGIN
  IF NEW.status NOT IN ('ACTIVE','PENDING') THEN RETURN NEW; END IF;
  SELECT * INTO v_sub FROM public.subscriptions WHERE id=NEW.subscription_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription does not exist'; END IF;
  IF v_sub.status<>'ACTIVE' OR v_sub.start_date>current_date OR
     (v_sub.end_date IS NOT NULL AND current_date > v_sub.end_date+v_sub.grace_days)
  THEN RAISE EXCEPTION 'Subscription is not active'; END IF;
  SELECT product_id INTO v_role_product FROM public.product_roles WHERE id=NEW.product_role_id AND status='ACTIVE';
  IF v_role_product IS DISTINCT FROM v_sub.product_id THEN RAISE EXCEPTION 'Product role mismatch'; END IF;
  SELECT identity_id,client_id,status INTO v_member FROM public.client_memberships WHERE id=NEW.membership_id;
  IF NOT FOUND OR v_member.identity_id IS DISTINCT FROM NEW.identity_id OR
     v_member.client_id IS DISTINCT FROM v_sub.client_id OR v_member.status<>'ACTIVE' OR
     NEW.client_id IS DISTINCT FROM v_sub.client_id THEN RAISE EXCEPTION 'Client membership mismatch'; END IF;
  SELECT count(*) INTO v_used FROM public.user_product_access
  WHERE subscription_id=NEW.subscription_id AND status IN ('ACTIVE','PENDING') AND id IS DISTINCT FROM NEW.id;
  SELECT coalesce(sum(extra_licenses),0) INTO v_extra FROM public.license_overrides WHERE subscription_id=NEW.subscription_id;
  IF v_used>=v_sub.license_limit+v_extra THEN RAISE EXCEPTION 'Subscription license limit reached'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_access_license_limit() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS enforce_access_license_limit ON public.user_product_access;
CREATE TRIGGER enforce_access_license_limit BEFORE INSERT OR UPDATE OF status,subscription_id,product_role_id,membership_id,client_id
ON public.user_product_access FOR EACH ROW EXECUTE FUNCTION public.enforce_access_license_limit();
