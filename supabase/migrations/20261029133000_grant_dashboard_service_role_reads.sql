-- Leituras administrativas usadas somente pelo backend do painel.
-- Nenhuma permissão é concedida a anon ou authenticated.

GRANT SELECT ON TABLE public.identities TO service_role;
GRANT SELECT ON TABLE public.invitations TO service_role;
GRANT SELECT ON TABLE public.products TO service_role;
GRANT SELECT ON TABLE public.subscriptions TO service_role;
GRANT SELECT ON TABLE public.user_product_access TO service_role;
