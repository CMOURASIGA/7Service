CREATE OR REPLACE FUNCTION public.activate_identity_after_auth_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_identity_id uuid;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.identities
      SET status='ACTIVE', activated_at=now()
    WHERE auth_user_id=NEW.id AND status='PENDING_INVITE'
    RETURNING id INTO v_identity_id;
    IF v_identity_id IS NOT NULL THEN
      INSERT INTO public.audit_logs(
        actor_identity_id,action,target_type,target_id,source
      ) VALUES(v_identity_id,'identity.activated','identity',v_identity_id,'auth');
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.activate_identity_after_auth_confirmation() FROM PUBLIC,anon,authenticated;
DO $$
BEGIN
 IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='auth' AND table_name='users' AND column_name='email_confirmed_at'
 ) THEN
  EXECUTE 'CREATE TRIGGER activate_identity_after_auth_confirmation AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.activate_identity_after_auth_confirmation()';
 END IF;
END $$;
