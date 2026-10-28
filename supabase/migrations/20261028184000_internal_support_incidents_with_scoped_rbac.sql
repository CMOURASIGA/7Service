INSERT INTO public.internal_permissions(code,description) VALUES
 ('support.view','Consultar incidentes administrativos de suporte'),
 ('support.manage','Criar e atualizar incidentes administrativos')
ON CONFLICT(code) DO NOTHING;
INSERT INTO public.internal_role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM public.internal_roles r
JOIN public.internal_permissions p ON (
 (p.code='support.view' AND r.code IN ('SUPER_ADMIN','OPERATIONS_ADMIN','SUPPORT','AUDITOR','COMMERCIAL'))
 OR (p.code='support.manage' AND r.code IN ('SUPER_ADMIN','OPERATIONS_ADMIN','SUPPORT'))
)
ON CONFLICT DO NOTHING;

CREATE TABLE public.support_incidents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
 product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT,
 environment_id uuid REFERENCES public.product_environments(id) ON DELETE RESTRICT,
 title text NOT NULL CHECK(char_length(title) BETWEEN 5 AND 180),
 description text,
 severity text NOT NULL DEFAULT 'MEDIUM' CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
 status text NOT NULL DEFAULT 'OPEN'
   CHECK(status IN ('OPEN','IN_PROGRESS','WAITING','RESOLVED','CLOSED')),
 created_by uuid NOT NULL REFERENCES public.internal_users(id),
 assigned_to uuid REFERENCES public.internal_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz
);
CREATE INDEX support_incidents_client_status_idx ON public.support_incidents(client_id,status);
CREATE INDEX support_incidents_assignee_idx ON public.support_incidents(assigned_to);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.support_incidents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE FUNCTION public.enforce_support_incident_links()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.environment_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.product_environments pe
  JOIN public.product_deployments pd ON pd.id=pe.deployment_id
  JOIN public.client_deployments cd ON cd.deployment_id=pd.id
  WHERE pe.id=NEW.environment_id AND cd.client_id=NEW.client_id
    AND (NEW.product_id IS NULL OR pd.product_id=NEW.product_id)
 ) THEN RAISE EXCEPTION 'Support incident environment is outside client/product'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_support_incident_links() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enforce_support_incident_links
BEFORE INSERT OR UPDATE OF client_id,product_id,environment_id ON public.support_incidents
FOR EACH ROW EXECUTE FUNCTION public.enforce_support_incident_links();
ALTER TABLE public.support_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_incidents_select ON public.support_incidents
FOR SELECT TO authenticated USING(public.has_internal_permission('support.view'));
CREATE POLICY support_incidents_insert ON public.support_incidents
FOR INSERT TO authenticated WITH CHECK(public.has_internal_permission('support.manage'));
CREATE POLICY support_incidents_update ON public.support_incidents
FOR UPDATE TO authenticated USING(public.has_internal_permission('support.manage'))
WITH CHECK(public.has_internal_permission('support.manage'));
GRANT SELECT,INSERT,UPDATE ON public.support_incidents TO authenticated;
