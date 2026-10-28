'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export interface IdentityFormState {
  error: string | null;
  success?: string;
}

export async function createIdentityMembershipAction(
  _previous: IdentityFormState,
  form: FormData,
): Promise<IdentityFormState> {
  const { internalUser } = await requirePermission('users.manage');
  const firstName = String(form.get('firstName') ?? '').trim();
  const lastName = String(form.get('lastName') ?? '').trim();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const clientId = String(form.get('clientId') ?? '');
  if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^[0-9a-f-]{36}$/i.test(clientId)) {
    return { error: 'Informe nome, sobrenome, e-mail e empresa válidos.' };
  }

  const db = createAdminClient();
  const { data: client, error: clientError } = await db.from('clients')
    .select('id,status').eq('id', clientId).maybeSingle();
  if (clientError || !client || client.status !== 'ACTIVE') {
    return { error: 'Empresa não encontrada ou não está ativa.' };
  }

  let { data: identity, error: lookupError } = await db.from('identities')
    .select('id,email,auth_user_id,status').ilike('email', email).maybeSingle();
  if (lookupError) return { error: 'Falha ao pesquisar identidade global.' };
  if (identity && ['REMOVED','BLOCKED'].includes(identity.status)) {
    return { error: 'Identidade existente está bloqueada ou removida.' };
  }

  let createdIdentity = false;
  if (!identity) {
    const { data, error } = await db.from('identities').insert({
      first_name:firstName, last_name:lastName,email,
      status:'PENDING_INVITE',client_id:null,
    }).select('id,email,auth_user_id,status').single();
    if (error || !data) return {error: error?.code === '23505' ?
      'Já existe identidade com este e-mail; recarregue os dados.' :
      'Falha ao cadastrar identidade global.'};
    identity = data;
    createdIdentity = true;
  }

  const { data: existingMembership,error:lookupMembershipError } = await db
    .from('client_memberships').select('id,status')
    .eq('identity_id',identity.id).eq('client_id',clientId).maybeSingle();
  if (lookupMembershipError) return {error:'Falha ao consultar o vínculo empresarial.'};
  if (existingMembership) {
    if(existingMembership.status !== 'ACTIVE') {
      return {error:'Já existe um vínculo não ativo. Regularize o status antes de conceder acesso.'};
    }
    if(!createdIdentity) return {error:'Esta pessoa já está vinculada à empresa.'};
  } else {
    const {error:membershipError} = await db.from('client_memberships').insert({
      identity_id:identity.id,client_id:clientId, status:'ACTIVE',granted_by:internalUser.id,
    });
    if(membershipError) return {error:'Identidade cadastrada, mas o vínculo empresarial não foi concluído.'};
  }

  if(!identity.auth_user_id) {
    const {data:invited,error:inviteError} = await db.auth.admin.inviteUserByEmail(email);
    if(inviteError || !invited.user) {
      return {error:'Vínculo cadastrado, mas o e-mail de ativação falhou. Requer reenvio seguro.'};
    }
    const {error:bindError} = await db.from('identities')
      .update({auth_user_id:invited.user.id}).eq('id',identity.id);
    if(bindError) return {error:'Convite enviado, mas a identidade Auth precisa ser conciliada.'};
  }

  const {error:auditError}=await db.from('audit_logs').insert({
    actor_internal_user_id:internalUser.id,
    action:createdIdentity?'identity.invited':'identity.membership_added',
    target_type:'identity',target_id:identity.id,client_id:clientId,
    source:'7service',
  });
  if(auditError) return {error:'Vínculo cadastrado, mas a auditoria não foi confirmada.'};
  revalidatePath('/usuarios');
  revalidatePath('/clientes/'+clientId);
  return {error:null,success:createdIdentity?'Identidade criada e convite solicitado.':'Vínculo com a empresa cadastrado.'};
}
