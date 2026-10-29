-- 7Service - bootstrap transacional e idempotente do primeiro SUPER_ADMIN.
--
-- Esta rotina existe exclusivamente para o primeiro operador da plataforma.
-- Ela nunca cria identidade Auth, nunca envia convite e só aceita o e-mail
-- previamente autorizado para esta implantação. A execução é restrita a
-- service_role e todas as escritas ocorrem na mesma transação da função.

GRANT SELECT ON TABLE public.clients TO service_role;
GRANT SELECT ON TABLE auth.users TO service_role;

CREATE OR REPLACE FUNCTION public.bootstrap_first_super_admin(p_expected_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_email constant text := 'contactconsultservices@gmail.com';
  v_auth_user_id uuid;
  v_internal_user_id uuid;
  v_role_id uuid;
  v_operator_count integer;
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Bootstrap requires service_role';
  END IF;

  IF lower(trim(coalesce(p_expected_email, ''))) <> v_email THEN
    RAISE EXCEPTION 'Bootstrap target is not authorized';
  END IF;

  PERFORM pg_advisory_xact_lock(7316222);

  SELECT count(*) INTO v_operator_count FROM public.internal_users;

  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE lower(email) = v_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authorized Auth user does not exist';
  END IF;

  IF (SELECT count(*) FROM auth.users WHERE lower(email) = v_email) <> 1 THEN
    RAISE EXCEPTION 'Authorized Auth user is ambiguous';
  END IF;

  IF v_operator_count > 0 THEN
    SELECT id INTO v_internal_user_id
    FROM public.internal_users
    WHERE auth_user_id = v_auth_user_id;

    IF NOT FOUND OR v_operator_count <> 1 THEN
      RAISE EXCEPTION 'Bootstrap already closed: internal operator exists';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.internal_user_roles ur
      JOIN public.internal_roles r ON r.id = ur.role_id
      WHERE ur.internal_user_id = v_internal_user_id
        AND r.code = 'SUPER_ADMIN'
    ) THEN
      RAISE EXCEPTION 'Existing bootstrap operator is not a SUPER_ADMIN';
    END IF;

    RETURN v_internal_user_id;
  END IF;

  SELECT id INTO v_role_id
  FROM public.internal_roles
  WHERE code = 'SUPER_ADMIN';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUPER_ADMIN role is missing';
  END IF;

  INSERT INTO public.internal_users(auth_user_id, first_name, last_name, email, status)
  VALUES (v_auth_user_id, 'Administrador', 'Consult Services', v_email, 'ACTIVE')
  RETURNING id INTO v_internal_user_id;

  INSERT INTO public.internal_user_roles(internal_user_id, role_id)
  VALUES (v_internal_user_id, v_role_id);

  INSERT INTO public.audit_logs(actor_internal_user_id, action, target_type, target_id, source)
  VALUES (v_internal_user_id, 'internal.bootstrap', 'internal_user', v_internal_user_id, 'bootstrap');

  RETURN v_internal_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_super_admin(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_super_admin(text) TO service_role;
