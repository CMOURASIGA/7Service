'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function setMembershipStatusAction(
  identityId:string,membershipId:string,status:'ACTIVE'|'SUSPENDED'|'REVOKED',form:FormData
) {
  const {internalUser}=await requirePermission('users.manage');
  const reason=String(form.get('reason')??'').trim();
  if(status!=='ACTIVE' && reason.length<5) throw new Error('Justificativa obrigatória com ao menos 5 caracteres.');
  const db=createAdminClient();
  const {data:previous,error:readError}=await db.from('client_memberships')
    .select('id,client_id,status').eq('id',membershipId)
    .eq('identity_id',identityId).maybeSingle();
  if(readError||!previous) throw new Error('Vínculo empresarial não encontrado.');
  if(previous.status===status) return;
  const {data:updated,error}=await db.from('client_memberships')
    .update({status}).eq('id',membershipId).eq('status',previous.status)
    .select('id').single();
  if(error||!updated) throw new Error('O vínculo foi alterado por outro operador. Recarregue a tela.');
  const {error:auditError}=await db.from('audit_logs').insert({
    actor_internal_user_id:internalUser.id,
    action:'membership.'+status.toLowerCase(),
    target_type:'client_membership',target_id:membershipId,client_id:previous.client_id,
    before_json:{status:previous.status},after_json:{status},reason:reason||null,source:'7service',
  });
  if(auditError) throw new Error('Vínculo atualizado, mas registro de auditoria indisponível.');
  revalidatePath('/usuarios/'+identityId);
  revalidatePath('/clientes/'+previous.client_id);
}
