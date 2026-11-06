-- HV-05: workflow for the existing public.product_environments model.
-- Does not provision infrastructure. Must be explicitly applied to central Supabase.
ALTER TABLE public.product_environments
  ADD COLUMN IF NOT EXISTS suspended_from_status text;

ALTER TABLE public.product_environments
  DROP CONSTRAINT IF EXISTS product_environments_status_check;
ALTER TABLE public.product_environments
  ADD CONSTRAINT product_environments_status_check CHECK
    (status IN ('PLANNED','PROVISIONING','ACTIVE','MAINTENANCE','SUSPENDED','RETIRED'));
ALTER TABLE public.product_environments
  ADD CONSTRAINT product_environments_suspend_origin_check CHECK
    (suspended_from_status IS NULL OR suspended_from_status IN ('PLANNED','ACTIVE'));

CREATE OR REPLACE FUNCTION public.manage_product_environment_atomic(
  p_actor_id uuid, p_environment_id uuid, p_action text,
  p_entry_url text DEFAULT NULL, p_version_sha text DEFAULT NULL,
  p_database_resource_ref text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_current public.product_environments%ROWTYPE;
  v_next text;
  v_product_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.internal_users u
    JOIN public.internal_user_roles ur ON ur.internal_user_id = u.id
    JOIN public.internal_role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.internal_permissions ip ON ip.id = rp.permission_id
    WHERE u.id = p_actor_id AND u.status = 'ACTIVE'
      AND ip.code = 'clients.manage'
  ) THEN RAISE EXCEPTION 'Permission denied for environment management' USING ERRCODE='42501'; END IF;

  SELECT * INTO v_current FROM public.product_environments
  WHERE id = p_environment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Environment not found'; END IF;
  IF v_current.status = 'RETIRED' THEN
    RAISE EXCEPTION 'Retired environment is immutable';
  END IF;
  SELECT product_id INTO v_product_id FROM public.product_deployments
  WHERE id = v_current.deployment_id;

  CASE p_action
  WHEN 'EDIT' THEN
    IF p_entry_url IS NOT NULL AND p_entry_url <> '' AND
      (p_entry_url NOT LIKE 'https://%' OR length(p_entry_url) > 2048)
      THEN RAISE EXCEPTION 'Invalid HTTPS URL'; END IF;
    IF p_version_sha IS NOT NULL AND p_version_sha <> '' AND
      p_version_sha !~ '^[a-fA-F0-9]{7,40}$'
      THEN RAISE EXCEPTION 'Invalid version SHA'; END IF;
    IF p_database_resource_ref IS NOT NULL AND
      length(p_database_resource_ref) > 200
      THEN RAISE EXCEPTION 'Invalid database reference'; END IF;
    UPDATE public.product_environments SET
      entry_url = NULLIF(p_entry_url,''),
      version_sha = NULLIF(p_version_sha,''),
      database_resource_ref = NULLIF(p_database_resource_ref,'')
    WHERE id = p_environment_id;
    v_next := v_current.status;
  WHEN 'SUSPEND' THEN
    IF v_current.status NOT IN ('PLANNED','ACTIVE') THEN
      RAISE EXCEPTION 'Only planned or active environments may be suspended';
    END IF;
    UPDATE public.product_environments
    SET status='SUSPENDED', suspended_from_status=v_current.status
    WHERE id=p_environment_id;
    v_next := 'SUSPENDED';
  WHEN 'REACTIVATE' THEN
    IF v_current.status <> 'SUSPENDED' OR
      v_current.suspended_from_status NOT IN ('PLANNED','ACTIVE')
      THEN RAISE EXCEPTION 'Environment cannot be reactivated'; END IF;
    UPDATE public.product_environments
    SET status=v_current.suspended_from_status, suspended_from_status=NULL
    WHERE id=p_environment_id;
    v_next := v_current.suspended_from_status;
  WHEN 'RETIRE' THEN
    UPDATE public.product_environments
    SET status='RETIRED', suspended_from_status=NULL
    WHERE id=p_environment_id;
    v_next := 'RETIRED';
  ELSE
    RAISE EXCEPTION 'Unknown environment lifecycle action';
  END CASE;

  INSERT INTO public.audit_logs
    (actor_internal_user_id,action,target_type,target_id,product_id,source,reason,metadata_safe)
  VALUES (p_actor_id, 'environment.' || lower(p_action), 'product_environment',
    p_environment_id, v_product_id, '7service', v_current.status || ' -> ' || v_next,
    jsonb_build_object('oldStatus',v_current.status,'newStatus',v_next));
  RETURN v_next;
END;
$$;
REVOKE ALL ON FUNCTION public.manage_product_environment_atomic(uuid,uuid,text,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manage_product_environment_atomic(uuid,uuid,text,text,text,text)
  TO service_role;
