DROP POLICY IF EXISTS subscriptions_select ON public.subscriptions;
CREATE POLICY subscriptions_select ON public.subscriptions
FOR SELECT TO authenticated USING (
  public.has_internal_permission('clients.view')
  OR EXISTS (
    SELECT 1
    FROM public.client_memberships cm
    JOIN public.identities i ON i.id = cm.identity_id
    WHERE cm.client_id = subscriptions.client_id
      AND cm.status = 'ACTIVE'
      AND i.auth_user_id = (SELECT auth.uid())
      AND i.status = 'ACTIVE'
  )
);
DROP POLICY IF EXISTS user_product_access_select_self ON public.user_product_access;
CREATE POLICY user_product_access_select_self ON public.user_product_access
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.identities i
    JOIN public.client_memberships cm ON cm.identity_id = i.id
    WHERE i.id = user_product_access.identity_id
      AND i.auth_user_id = (SELECT auth.uid())
      AND i.status = 'ACTIVE'
      AND cm.id = user_product_access.membership_id
      AND cm.client_id = user_product_access.client_id
      AND cm.status = 'ACTIVE'
  )
);
