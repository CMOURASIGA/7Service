-- 7Service, additive schema for central provisioning.
-- TARGET: existing 7Service Supabase ONLY. DO NOT create a Supabase project.
-- NOT APPLIED: review and run in controlled develop/homologation migration.
-- All new authorization structures begin in SHADOW/DISABLED mode.
-- No existing subscriptions, grants, contracts or users are modified.
BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 3 AND 160),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.customer_groups(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id,client_id)
);
-- A company belongs to at most one active contractual group.
CREATE UNIQUE INDEX IF NOT EXISTS customer_group_members_one_active_group
  ON public.customer_group_members(client_id) WHERE status='ACTIVE';

CREATE TABLE IF NOT EXISTS public.contract_seat_pools (
  contract_id uuid PRIMARY KEY REFERENCES public.contracts(id),
  group_id uuid REFERENCES public.customer_groups(id),
  license_limit integer NOT NULL CHECK (license_limit >= 0),
  enforcement_mode text NOT NULL DEFAULT 'SHADOW'
    CHECK (enforcement_mode IN ('SHADOW','ENFORCED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_product_entitlements (
  contract_id uuid NOT NULL REFERENCES public.contracts(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(contract_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.contract_named_seats (
  contract_id uuid NOT NULL REFERENCES public.contracts(id),
  identity_id uuid NOT NULL REFERENCES public.identities(id),
  status text NOT NULL DEFAULT 'RESERVED' CHECK (status IN ('RESERVED','ACTIVE','RELEASED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(contract_id, identity_id)
);
CREATE INDEX IF NOT EXISTS contract_named_seats_active
  ON public.contract_named_seats(contract_id) WHERE status IN ('RESERVED','ACTIVE');

CREATE TABLE IF NOT EXISTS public.environment_connections (
  environment_id uuid PRIMARY KEY REFERENCES public.product_environments(id),
  project_url text NOT NULL CHECK (project_url ~ '^https://[a-z0-9-]+[.]supabase[.]co$'),
  project_ref text NOT NULL CHECK (project_ref ~ '^[a-z0-9-]+$'),
  encrypted_admin_key text NOT NULL,
  status text NOT NULL DEFAULT 'DISABLED' CHECK (status IN ('DISABLED','VERIFIED','ERROR')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.environment_company_bindings (
  environment_id uuid NOT NULL REFERENCES public.product_environments(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  remote_company_id text NOT NULL CHECK (length(remote_company_id) BETWEEN 1 AND 128),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(environment_id, client_id),
  UNIQUE(environment_id, remote_company_id)
);

CREATE TABLE IF NOT EXISTS public.destination_auth_links (
  environment_id uuid NOT NULL REFERENCES public.product_environments(id),
  identity_id uuid NOT NULL REFERENCES public.identities(id),
  remote_auth_user_id uuid NOT NULL,
  remote_email text NOT NULL CHECK (remote_email = lower(remote_email)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(environment_id, identity_id),
  UNIQUE(environment_id, remote_auth_user_id)
);

CREATE TABLE IF NOT EXISTS public.provisioning_operations (
  request_id uuid PRIMARY KEY,
  environment_id uuid NOT NULL REFERENCES public.product_environments(id),
  identity_id uuid NOT NULL REFERENCES public.identities(id),
  operation text NOT NULL CHECK (operation IN ('INVITE','VERIFY','RECOVER','GRANT','REVOKE')),
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','RUNNING','CONFIRMED','FAILED','RECONCILIATION_REQUIRED')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sensitive tables: no direct Data API access to anon or authenticated.
-- Application routes must use narrowly authorized server actions.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customer_groups','customer_group_members','contract_seat_pools',
    'contract_product_entitlements','contract_named_seats','environment_connections',
    'environment_company_bindings','destination_auth_links','provisioning_operations'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role',t);
  END LOOP;
END $$;
COMMIT;
