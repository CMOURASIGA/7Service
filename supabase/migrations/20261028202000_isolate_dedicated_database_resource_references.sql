CREATE OR REPLACE FUNCTION public.enforce_unique_dedicated_database_reference()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_model text; v_client uuid; v_other boolean;
BEGIN
  IF NULLIF(trim(NEW.database_resource_ref),'') IS NULL THEN RETURN NEW; END IF;
  SELECT d.model,cd.client_id INTO v_model,v_client
  FROM public.product_deployments d
  LEFT JOIN public.client_deployments cd ON cd.deployment_id=d.id
  WHERE d.id=NEW.deployment_id LIMIT 1;
  IF v_model IS DISTINCT FROM 'DEDICATED' THEN RETURN NEW; END IF;
  IF v_client IS NULL THEN RAISE EXCEPTION 'Dedicated deployment requires a client assignment'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.database_resource_ref,72));
  SELECT EXISTS(
    SELECT 1 FROM public.product_environments e
    JOIN public.product_deployments d ON d.id=e.deployment_id
    JOIN public.client_deployments cd ON cd.deployment_id=d.id
    WHERE e.id IS DISTINCT FROM NEW.id
      AND e.database_resource_ref=NEW.database_resource_ref
      AND d.model='DEDICATED' AND cd.client_id<>v_client
  ) INTO v_other;
  IF v_other THEN RAISE EXCEPTION 'Dedicated database resource already belongs to another client'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_unique_dedicated_database_reference() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS enforce_unique_dedicated_database_reference ON public.product_environments;
CREATE TRIGGER enforce_unique_dedicated_database_reference
BEFORE INSERT OR UPDATE OF database_resource_ref,deployment_id ON public.product_environments
FOR EACH ROW EXECUTE FUNCTION public.enforce_unique_dedicated_database_reference();
