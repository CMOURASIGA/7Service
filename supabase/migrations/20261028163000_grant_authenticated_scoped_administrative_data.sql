GRANT SELECT, INSERT, UPDATE ON public.clients, public.client_addresses, public.client_contacts TO authenticated;
GRANT SELECT ON public.subscriptions, public.client_memberships TO authenticated;
GRANT SELECT ON public.product_environments, public.product_deployments TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
