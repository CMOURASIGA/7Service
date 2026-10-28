'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type EnvironmentGrantState = { error: string | null; success?: string };

export async function grantEnvironmentAction(identityId:string,_prev:EnvironmentGrantState,form:FormData):Promise<EnvironmentGrantState> {
  const {internalUser}=await requirePermission('users.access.manage');
  const accessId=String(form.get('accessId')??'');
  const environmentId=String(form.get('environmentId')??'');
  if(!uuid.test(accessId)||!uuid.test(environmentId)) return {error:'Identifique acesso e ambiente válidos.'};
  const db=createAdminClient();
  const [access,env]=await Promise.all([
    db.from('user_product_access')
      .select('id,identity_id,client_id,membership_id,status,subscriptions!user_product_access_subscription_id_fkey(product_id)')
      .eq('id',accessId).eq('identity_id',identityId).maybeSingle(),
    db.from('product_environments')
      .select('id,deployment_id,status,product_deployments(product_id)')
      .eq('id',environmentId).maybeSingle(),
  ]);
  if(access.error||env.error||!access.data||!env.data) return {error:'Acesso ou ambiente não encontrado.'};
  if(access.data.status!=='ACTIVE'||env.data.status!=='ACTIVE')
    return {error:'Acesso e ambiente precisam estar ativos.'};
  if(access.data.subscriptions?.product_id!==env.data.product_deployments?.product_id)
    return {error:'O ambiente não pertence ao produto autorizado.'};
  const {data:deployment,error:deploymentError}=await db.from('client_deployments')
    .select('id').eq('deployment_id',env.data.deployment_id)
    .eq('client_id',access.data.client_id).maybeSingle();
  if(deploymentError||!deployment) return {error:'Ambiente não vinculado à empresa.'};
  const {data:inserted,error}=await db.from('environment_access').upsert({
    membership_id:access.data.membership_id,
    environment_id:environmentId,access_id:accessId,status:'ACTIVE',
  },{onConflict:'membership_id,environment_id,access_id'}).select('id').single();
  if(error||!inserted) return {error:error?.message??'Não foi possível autorizar o ambiente.'};
  const {error:auditError}=await db.from('audit_logs').insert({
    actor_internal_user_id:internalUser.id,action:'environment.access_granted',
    target_type:'environment_access',target_id:inserted.id,
    client_id:access.data.client_id,source:'7service',
  });
  if(auditError) return {error:'Acesso autorizado, mas a auditoria não foi confirmada.'};
  revalidatePath('/usuarios/'+identityId);
  return {error:null,success:'Acesso ao ambiente autorizado.'};
}

export async function revokeEnvironmentAction(
  identityId:string,grantId:string,_form:FormData
) {
  const {internalUser}=await requirePermission('users.access.manage');
  const db=createAdminClient();
  const {data:existing,error:readError}=await db.from('environment_access')
    .select('id,membership_id,access_id,user_product_access!environment_access_access_id_fkey(client_id,identity_id)')
    .eq('id',grantId).maybeSingle();
  if(readError||!existing||existing.user_product_access?.identity_id!==identityId)
    throw new Error('Autorização não encontrada para esta identidade.');
  const {data:updated,error}=await db.from('environment_access')
    .update({status:'REVOKED'}).eq('id',grantId).select('id').single();
  if(error||!updated) throw new Error('Não foi possível revogar autorização.');
  const {error:auditError}=await db.from('audit_logs').insert({
    actor_internal_user_id:internalUser.id,action:'environment.access_revoked',
    target_type:'environment_access',target_id:grantId,
    client_id:existing.user_product_access.client_id,source:'7service',
  });
  if(auditError) throw new Error('Revogação efetuada sem auditoria; requer conciliação.');
  revalidatePath('/usuarios/'+identityId);
}
