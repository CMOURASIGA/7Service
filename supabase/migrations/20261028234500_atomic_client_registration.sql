CREATE OR REPLACE FUNCTION public.create_client_atomic(p_actor uuid,p_person_type text,p_document text,p_legal_name text,p_trade_name text,p_phone text,p_email text,p_contact_name text,p_notes text,p_address jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id JOIN public.internal_permissions ip ON ip.id=rp.permission_id WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='clients.manage') THEN
  RAISE EXCEPTION 'Permission denied';
 END IF;
 IF p_person_type NOT IN ('PF','PJ') OR length(trim(coalesce(p_legal_name,''))) < 2 THEN
  RAISE EXCEPTION 'Invalid client data';
 END IF;
 IF p_document !~ '^[0-9]{11}$' AND p_document !~ '^[0-9]{14}$' THEN
  RAISE EXCEPTION 'Invalid document';
 END IF;
 IF (p_person_type='PF' AND length(p_document)<>11) OR (p_person_type='PJ' AND length(p_document)<>14) THEN
  RAISE EXCEPTION 'Invalid document size';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_document,0));
 IF EXISTS(SELECT 1 FROM public.clients WHERE document=p_document AND status<>'CLOSED') THEN
  RAISE EXCEPTION 'Duplicate client document';
 END IF;
 INSERT INTO public.clients(person_type,document,legal_name,trade_name,phone,email,contact_name,notes,relationship_start_date)
 VALUES(p_person_type,p_document,trim(p_legal_name),p_trade_name,p_phone,p_email,p_contact_name,p_notes,current_date)
 RETURNING id INTO v_id;
 IF p_address IS NOT NULL THEN
  INSERT INTO public.client_addresses(client_id,postal_code,street,number,complement,district,city,state,country)
  VALUES(v_id,p_address->>'postalCode',p_address->>'street',p_address->>'number',p_address->>'complement',p_address->>'district',p_address->>'city',p_address->>'state',coalesce(nullif(p_address->>'country',''),'BR'));
 END IF;
 INSERT INTO public.audit_logs(action,target_type,target_id,client_id,actor_internal_user_id,reason,source)
 VALUES('client.created','client',v_id,v_id,p_actor,'Cadastro administrativo','7service');
 RETURN v_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.create_client_atomic(uuid,text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_client_atomic(uuid,text,text,text,text,text,text,text,text,jsonb) TO service_role;
