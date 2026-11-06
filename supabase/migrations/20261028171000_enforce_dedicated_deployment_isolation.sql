-- A dedicated deployment belongs to one client only.
CREATE OR REPLACE FUNCTION public.enforce_dedicated_deployment_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.product_deployments d
    JOIN public.client_deployments cd ON cd.deployment_id = d.id
    WHERE d.id = NEW.deployment_id AND d.model = 'DEDICATED'
      AND cd.client_id <> NEW.client_id
  ) THEN
    RAISE EXCEPTION 'Dedicated deployment cannot belong to multiple clients';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enforce_dedicated_deployment_owner() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_dedicated_deployment_owner
BEFORE INSERT OR UPDATE OF deployment_id,client_id ON public.client_deployments
FOR EACH ROW EXECUTE FUNCTION public.enforce_dedicated_deployment_owner();
CREATE OR REPLACE FUNCTION public.enforce_deployment_mode_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.model = 'DEDICATED' AND OLD.model IS DISTINCT FROM NEW.model AND
     (SELECT count(DISTINCT client_id) FROM public.client_deployments WHERE deployment_id = NEW.id) > 1 THEN
    RAISE EXCEPTION 'Shared deployment with multiple clients cannot become dedicated';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enforce_deployment_mode_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_deployment_mode_change
BEFORE UPDATE OF model ON public.product_deployments
FOR EACH ROW EXECUTE FUNCTION public.enforce_deployment_mode_change();
