CREATE OR REPLACE FUNCTION public.update_client_atomic(p_actor uuid,p_client uuid,p_legal_name text,p_trade_name text,p_phone text,p_email text,p_contact_name text,p_notes text,p_address jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_old_name text;v_address uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id JOIN public.internal_permissions ip ON ip.id=rp.permission_id WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='clients.manage') THEN RAISE EXCEPTION 'Permission denied'; END IF;
 SELECT legal_name INTO v_old_name FROM public.clients WHERE id=p_client AND status<>'CLOSED' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Client unavailable'; END IF;
 IF length(trim(coalesce(p_legal_name,'')))<2 OR length(p_legal_name)>250 THEN RAISE EXCEPTION 'Invalid legal name'; END IF;
 UPDATE public.clients SET legal_name=trim(p_legal_name),trade_name=p_trade_name,phone=p_phone,email=p_email,contact_name=p_contact_name,notes=p_notes WHERE id=p_client;
 IF p_address IS NOT NULL THEN
   SELECT id INTO v_address FROM public.client_addresses WHERE client_id=p_client ORDER BY created_at,id LIMIT 1 FOR UPDATE;
   IF v_address IS NULL THEN
     INSERT INTO public.client_addresses(client_id,postal_code,street,number,complement,district,city,state,country)
     VALUES(p_client,p_address->>'postalCode',p_address->>'street',p_address->>'number',p_address->>'complement',p_address->>'district',p_address->>'city',p_address->>'state',coalesce(p_address->>'country','BR'));
   ELSE
     UPDATE public.client_addresses SET postal_code=p_address->>'postalCode',street=p_address->>'street',number=p_address->>'number',complement=p_address->>'complement',district=p_address->>'district',city=p_address->>'city',state=p_address->>'state',country=coalesce(p_address->>'country','BR') WHERE id=v_address;
   END IF;
 END IF;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,client_id,source,before_json,after_json)
 VALUES(p_actor,'client.updated','client',p_client,p_client,'7service',jsonb_build_object('legal_name',v_old_name),jsonb_build_object('legal_name',trim(p_legal_name)));
 RETURN p_client;
END $$;
REVOKE ALL ON FUNCTION public.update_client_atomic(uuid,uuid,text,text,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_atomic(uuid,uuid,text,text,text,text,text,text,jsonb) TO service_role;
