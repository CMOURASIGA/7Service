CREATE TABLE IF NOT EXISTS public.welcome_email_deliveries (
  identity_id uuid PRIMARY KEY REFERENCES public.identities(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('RESERVED','SENT','FAILED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.welcome_email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.welcome_email_deliveries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.welcome_email_deliveries TO service_role;
