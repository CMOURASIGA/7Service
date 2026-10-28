CREATE TABLE IF NOT EXISTS public.deployment_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 environment_id uuid NOT NULL REFERENCES public.product_environments(id),
 commit_sha text NOT NULL CHECK(commit_sha ~ '^[a-f0-9]{40}$'),
 provider text NOT NULL CHECK(provider IN ('GITHUB_ACTIONS','VERCEL','MANUAL_REVIEW')),
 run_reference text NOT NULL CHECK(length(run_reference) BETWEEN 8 AND 512),
 verification_state text NOT NULL DEFAULT 'UNVERIFIED' CHECK(verification_state IN ('UNVERIFIED','VERIFIED','REJECTED')),
 recorded_by uuid NOT NULL REFERENCES public.internal_users(id),
 verified_by uuid REFERENCES public.internal_users(id),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 verified_at timestamptz,
 notes text,
 UNIQUE(environment_id,provider,run_reference)
);
ALTER TABLE public.deployment_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY deployment_evidence_read ON public.deployment_evidence FOR SELECT TO authenticated
USING(public.has_internal_permission('clients.view'));
REVOKE ALL ON public.deployment_evidence FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.deployment_evidence TO authenticated;
CREATE OR REPLACE FUNCTION public.record_deployment_evidence(
 p_actor uuid,p_environment uuid,p_sha text,p_provider text,p_reference text,p_notes text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.internal_users u JOIN public.internal_user_roles ur ON ur.internal_user_id=u.id
 JOIN public.internal_role_permissions rp ON rp.role_id=ur.role_id
 JOIN public.internal_permissions ip ON ip.id=rp.permission_id
 WHERE u.id=p_actor AND u.status='ACTIVE' AND ip.code='clients.manage')
 THEN RAISE EXCEPTION 'Not authorized'; END IF;
 INSERT INTO public.deployment_evidence(environment_id,commit_sha,provider,run_reference,recorded_by,notes)
 VALUES(p_environment,lower(p_sha),p_provider,p_reference,p_actor,p_notes) RETURNING id INTO v_id;
 INSERT INTO public.audit_logs(actor_internal_user_id,action,target_type,target_id,source)
 VALUES(p_actor,'deployment.evidence_recorded','deployment_evidence',v_id,'7service');
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.record_deployment_evidence(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_deployment_evidence(uuid,uuid,text,text,text,text) TO service_role;
