CREATE OR REPLACE FUNCTION public.enforce_active_identity_on_access()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status IN ('ACTIVE','PENDING') AND NOT EXISTS (
  SELECT 1 FROM public.identities WHERE id=NEW.identity_id AND status IN ('ACTIVE','PENDING_INVITE')
 ) THEN RAISE EXCEPTION 'Identity inactive'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_active_identity_on_access() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enforce_active_identity_on_access
BEFORE INSERT OR UPDATE OF identity_id,status ON public.user_product_access
FOR EACH ROW EXECUTE FUNCTION public.enforce_active_identity_on_access();
