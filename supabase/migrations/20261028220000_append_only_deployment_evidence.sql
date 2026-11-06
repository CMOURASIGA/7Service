CREATE OR REPLACE FUNCTION public.prevent_deployment_evidence_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Deployment evidence is append-only'; END IF;
 IF OLD.environment_id IS DISTINCT FROM NEW.environment_id
 OR OLD.commit_sha IS DISTINCT FROM NEW.commit_sha
 OR OLD.provider IS DISTINCT FROM NEW.provider
 OR OLD.run_reference IS DISTINCT FROM NEW.run_reference
 OR OLD.recorded_by IS DISTINCT FROM NEW.recorded_by
 OR OLD.recorded_at IS DISTINCT FROM NEW.recorded_at
 OR OLD.notes IS DISTINCT FROM NEW.notes
 THEN RAISE EXCEPTION 'Deployment evidence identity is immutable'; END IF;
 IF OLD.verification_state <> 'UNVERIFIED'
 OR NEW.verification_state NOT IN ('VERIFIED','REJECTED')
 THEN RAISE EXCEPTION 'Evidence verification transition is not allowed'; END IF;
 IF NEW.verified_by IS NULL OR NEW.verified_at IS NULL
 THEN RAISE EXCEPTION 'Verification actor and timestamp are required'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS prevent_deployment_evidence_mutation ON public.deployment_evidence;
CREATE TRIGGER prevent_deployment_evidence_mutation BEFORE UPDATE OR DELETE
ON public.deployment_evidence FOR EACH ROW EXECUTE FUNCTION public.prevent_deployment_evidence_mutation();
REVOKE ALL ON FUNCTION public.prevent_deployment_evidence_mutation() FROM PUBLIC,anon,authenticated;
