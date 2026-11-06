CREATE OR REPLACE FUNCTION public.validate_environment_access_tenant()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_client uuid; v_product uuid;
BEGIN
  SELECT m.client_id INTO v_client FROM public.client_memberships m
  WHERE m.id=NEW.membership_id;
  IF v_client IS NULL THEN RAISE EXCEPTION 'Membership not found'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_product_access a
    JOIN public.subscriptions s ON s.id=a.subscription_id
    WHERE a.id=NEW.access_id AND a.membership_id=NEW.membership_id
      AND a.client_id=v_client AND s.client_id=v_client
  ) THEN RAISE EXCEPTION 'Access not associated with membership/client'; END IF;
  SELECT d.product_id INTO v_product
  FROM public.product_environments e
  JOIN public.product_deployments d ON d.id=e.deployment_id
  JOIN public.client_deployments cd ON cd.deployment_id=d.id
  WHERE e.id=NEW.environment_id AND cd.client_id=v_client;
  IF v_product IS NULL THEN RAISE EXCEPTION 'Environment not assigned to client'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_product_access a
    JOIN public.subscriptions s ON s.id=a.subscription_id
    WHERE a.id=NEW.access_id AND s.product_id=v_product
  ) THEN RAISE EXCEPTION 'Environment product mismatch'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_environment_access_tenant() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_environment_access_tenant
BEFORE INSERT OR UPDATE OF membership_id,environment_id,access_id ON public.environment_access
FOR EACH ROW EXECUTE FUNCTION public.validate_environment_access_tenant();
