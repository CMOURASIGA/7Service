
-- 7Service dedicated environment + multi-company foundation
CREATE TABLE public.client_memberships(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED','REVOKED','PENDING')),
 granted_by uuid REFERENCES public.internal_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(identity_id,client_id),
 UNIQUE(id,client_id),
 UNIQUE(id,identity_id,client_id)
);
INSERT INTO public.client_memberships(identity_id,client_id)
SELECT id,client_id FROM public.identities WHERE client_id IS NOT NULL
ON CONFLICT(identity_id,client_id) DO NOTHING;
ALTER TABLE public.identities ALTER COLUMN client_id DROP NOT NULL;
COMMENT ON COLUMN public.identities.client_id IS 'Legacy only; use client_memberships, remove after migrated applications';
ALTER TABLE public.user_product_access ADD COLUMN membership_id uuid;
ALTER TABLE public.user_product_access ADD COLUMN client_id uuid;
UPDATE public.user_product_access a SET client_id=s.client_id, membership_id=m.id
FROM public.subscriptions s JOIN public.client_memberships m ON m.client_id=s.client_id
WHERE a.subscription_id=s.id AND m.identity_id=a.identity_id;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_id_client_unique UNIQUE(id,client_id);
ALTER TABLE public.user_product_access ADD CONSTRAINT access_membership_client_fk
 FOREIGN KEY(membership_id,identity_id,client_id) REFERENCES public.client_memberships(id,identity_id,client_id);
ALTER TABLE public.user_product_access ADD CONSTRAINT access_subscription_client_fk
 FOREIGN KEY(subscription_id,client_id) REFERENCES public.subscriptions(id,client_id);
CREATE OR REPLACE FUNCTION public.validate_access_membership() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE m public.client_memberships%ROWTYPE; s public.subscriptions%ROWTYPE; r public.product_roles%ROWTYPE;
BEGIN
 SELECT * INTO m FROM public.client_memberships WHERE id=NEW.membership_id;
 SELECT * INTO s FROM public.subscriptions WHERE id=NEW.subscription_id;
 SELECT * INTO r FROM public.product_roles WHERE id=NEW.product_role_id;
 IF m.id IS NULL OR s.id IS NULL OR r.id IS NULL OR m.identity_id<>NEW.identity_id OR m.client_id<>s.client_id OR NEW.client_id<>s.client_id OR r.product_id<>s.product_id OR m.status<>'ACTIVE' THEN
  RAISE EXCEPTION 'Invalid membership, subscription or product role combination';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_membership_on_access BEFORE INSERT OR UPDATE ON public.user_product_access
FOR EACH ROW EXECUTE FUNCTION public.validate_access_membership();
CREATE TABLE public.product_deployments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES public.products(id),
 model text NOT NULL DEFAULT 'DEDICATED' CHECK(model IN ('DEDICATED','SHARED')),
 name text NOT NULL,
 status text NOT NULL DEFAULT 'PLANNED' CHECK(status IN ('PLANNED','PROVISIONING','ACTIVE','SUSPENDED','RETIRED')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,product_id)
);
CREATE TABLE public.client_deployments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES public.clients(id),
 product_id uuid NOT NULL REFERENCES public.products(id),
 deployment_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(client_id,deployment_id),
 UNIQUE(id,client_id),
 FOREIGN KEY(deployment_id,product_id) REFERENCES public.product_deployments(id,product_id)
);
CREATE TABLE public.product_environments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 deployment_id uuid NOT NULL REFERENCES public.product_deployments(id),
 environment text NOT NULL CHECK(environment IN ('PRODUCTION','HOMOLOGATION','DEVELOPMENT','DEMO')),
 entry_url text,
 status text NOT NULL DEFAULT 'PLANNED' CHECK(status IN ('PLANNED','PROVISIONING','ACTIVE','MAINTENANCE','RETIRED')),
 database_resource_ref text,
 version_sha text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(deployment_id,environment),
 UNIQUE(id,deployment_id)
);
CREATE TABLE public.environment_access(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 membership_id uuid NOT NULL REFERENCES public.client_memberships(id),
 environment_id uuid NOT NULL REFERENCES public.product_environments(id),
 access_id uuid NOT NULL REFERENCES public.user_product_access(id),
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED','REVOKED')),
 valid_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(membership_id,environment_id,access_id)
);
CREATE OR REPLACE FUNCTION public.validate_environment_access() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NOT EXISTS (
 SELECT 1 FROM public.client_memberships m
 JOIN public.user_product_access a ON a.membership_id=m.id AND a.client_id=m.client_id AND a.status='ACTIVE'
 JOIN public.subscriptions s ON s.id=a.subscription_id AND s.client_id=m.client_id
 JOIN public.client_deployments cd ON cd.client_id=m.client_id AND cd.product_id=s.product_id
 JOIN public.product_environments pe ON pe.deployment_id=cd.deployment_id
 WHERE m.id=NEW.membership_id AND m.status='ACTIVE' AND a.id=NEW.access_id AND pe.id=NEW.environment_id
 ) THEN RAISE EXCEPTION 'Environment access must match active membership, product subscription and client deployment'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_environment_access BEFORE INSERT OR UPDATE ON public.environment_access
 FOR EACH ROW EXECUTE FUNCTION public.validate_environment_access();
CREATE TABLE public.client_feature_flags(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES public.clients(id),
 feature_id uuid NOT NULL REFERENCES public.product_features(id),
 enabled boolean NOT NULL DEFAULT false,
 reason text,
 changed_by uuid REFERENCES public.internal_users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(client_id,feature_id)
);
CREATE TABLE public.deployment_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 environment_id uuid NOT NULL REFERENCES public.product_environments(id),
 commit_sha text NOT NULL,
 deployed_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL CHECK(status IN ('PENDING','SUCCESS','FAILED','ROLLED_BACK')),
 actor_id uuid REFERENCES public.internal_users(id),
 notes text
);
CREATE TABLE public.infrastructure_resources(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 environment_id uuid NOT NULL REFERENCES public.product_environments(id),
 provider text NOT NULL,
 resource_type text NOT NULL CHECK(resource_type IN ('DATABASE','HOSTING','STORAGE','OTHER')),
 external_ref text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(environment_id,resource_type,external_ref)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['client_memberships','product_deployments','client_deployments','product_environments','environment_access','client_feature_flags','deployment_versions','infrastructure_resources']
 LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',t);
  EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role',t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_internal_permission(''clients.view'') AND public.has_internal_permission(''clients.manage'')) WITH CHECK (public.has_internal_permission(''clients.manage''))','internal_manage_'||t,t);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.validate_access_membership() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.validate_environment_access() FROM PUBLIC,anon,authenticated;

