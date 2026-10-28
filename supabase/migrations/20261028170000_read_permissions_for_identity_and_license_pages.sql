GRANT SELECT ON public.identities, public.user_product_access, public.subscriptions, public.license_overrides, public.clients, public.products TO authenticated;
GRANT SELECT ON public.client_memberships TO authenticated;
