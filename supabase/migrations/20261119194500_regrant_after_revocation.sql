BEGIN;
-- Historical revocations remain immutable, while a newly approved grant
-- for the same identity/subscription receives a new id and audit event.
-- Preserve at most one currently usable/suspended grant per subscription.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_product_access_current_grant
  ON public.user_product_access(identity_id,subscription_id)
  WHERE status IN ('ACTIVE','PENDING','SUSPENDED');
ALTER TABLE public.user_product_access
  DROP CONSTRAINT IF EXISTS user_product_access_identity_id_subscription_id_key;
COMMIT;