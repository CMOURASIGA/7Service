DROP POLICY IF EXISTS subscriptions_write ON public.subscriptions;
CREATE POLICY subscriptions_write ON public.subscriptions FOR ALL TO authenticated
USING (public.has_internal_permission('contracts.manage'))
WITH CHECK (public.has_internal_permission('contracts.manage'));
