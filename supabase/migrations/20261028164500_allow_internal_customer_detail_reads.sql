GRANT SELECT ON public.contracts, public.products, public.identities TO authenticated;
GRANT SELECT ON public.client_addresses TO authenticated;
DROP POLICY IF EXISTS internal_manage_client_memberships ON public.client_memberships;
CREATE POLICY internal_memberships_read ON public.client_memberships FOR SELECT TO authenticated USING (public.has_internal_permission('clients.view'));
CREATE POLICY internal_memberships_manage ON public.client_memberships FOR ALL TO authenticated USING (public.has_internal_permission('users.manage')) WITH CHECK (public.has_internal_permission('users.manage'));
GRANT SELECT ON public.client_memberships TO authenticated;
