DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select ON public.clients FOR SELECT TO authenticated
USING (public.has_internal_permission('clients.view'));
DROP POLICY IF EXISTS clients_write ON public.clients;
CREATE POLICY clients_write ON public.clients FOR ALL TO authenticated
USING (public.has_internal_permission('clients.manage'))
WITH CHECK (public.has_internal_permission('clients.manage'));
CREATE POLICY client_memberships_select_self ON public.client_memberships
FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.identities i
 WHERE i.id=client_memberships.identity_id
 AND i.auth_user_id=(SELECT auth.uid()) AND i.status='ACTIVE')
);