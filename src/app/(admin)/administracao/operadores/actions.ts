'use server';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import type { InternalRoleCode } from '@/types/domain';

const validRoles: InternalRoleCode[] = ['SUPER_ADMIN','OPERATIONS_ADMIN','SUPPORT','COMMERCIAL','FINANCE','AUDITOR'];
export interface InternalUserFormState { error: string | null; }

async function assertLastAdminSafe(userId: string, roles?: InternalRoleCode[], block = false) {
  const db = createAdminClient();
  const { data: rows, error } = await db.from('internal_user_roles')
    .select('internal_user_id,internal_roles!inner(code),internal_users!inner(status)')
    .eq('internal_roles.code','SUPER_ADMIN').eq('internal_users.status','ACTIVE');
  if (error) throw error;
  const activeAdmins = new Set((rows ?? []).map(x => x.internal_user_id));
  if (activeAdmins.has(userId) && activeAdmins.size <= 1 && (block || !roles?.includes('SUPER_ADMIN'))) {
    throw new Error('Nao e permitido remover o ultimo superadministrador ativo.');
  }
}
async function recordAudit(actorId:string, action:string, targetId:string) {
  const { error } = await createAdminClient().from('audit_logs').insert({
    actor_internal_user_id:actorId,action,target_type:'internal_user',target_id:targetId,source:'7service'
  });
  if (error) throw error;
}
export async function createInternalUserAction(_previous:InternalUserFormState, form:FormData):Promise<InternalUserFormState> {
  const {internalUser} = await requirePermission('internal_users.manage');
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const firstName = String(form.get('firstName') ?? '').trim();
  const lastName = String(form.get('lastName') ?? '').trim();
  const roles = form.getAll('roleCodes').filter((x):x is string => typeof x === 'string');
  if (!email.includes('@') || !firstName || !lastName || !roles.length ||
      roles.some(x => !validRoles.includes(x as InternalRoleCode))) {
    return {error:'Informe os dados e ao menos um perfil valido.'};
  }
  const db = createAdminClient();
  const {data:existing,error:existingError} = await db.from('internal_users')
    .select('id').ilike('email',email).maybeSingle();
  if(existingError) return {error:'Falha ao verificar operador existente.'};
  if(existing) return {error:'Ja existe operador com este e-mail.'};
  const {data:roleRows,error:roleError} = await db.from('internal_roles').select('id,code').in('code',roles);
  if(roleError || roleRows?.length !== new Set(roles).size) return {error:'Perfil nao reconhecido.'};
  const {data:invitation,error:inviteError} = await db.auth.admin.inviteUserByEmail(email);
  if(inviteError || !invitation.user) return {error:'Nao foi possivel enviar convite administrativo.'};
  const {data:created,error:createError} = await db.from('internal_users').insert({
    auth_user_id:invitation.user.id, first_name:firstName, last_name:lastName,email,status:'ACTIVE',
  }).select('id').single();
  if(createError || !created) return {error:'Convite enviado, mas vinculo de operador nao foi gravado. Requer conciliacao.'};
  const {error:assignedError} = await db.from('internal_user_roles').insert(
    roleRows.map(r=>({internal_user_id:created.id,role_id:r.id,assigned_by:internalUser.id}))
  );
  if(assignedError) {
    await db.from('internal_users').update({status:'BLOCKED'}).eq('id',created.id);
    return {error:'Convite enviado, mas atribuicao de perfis falhou. Operador bloqueado para conciliacao.'};
  }
  await recordAudit(internalUser.id,'internal_user.invited',created.id);
  revalidatePath('/administracao/operadores');
  return {error:null};
}
export async function updateInternalUserRolesAction(userId:string, formData:FormData) {
  const {internalUser} = await requirePermission('internal_users.manage');
  const roles = formData.getAll('roleCodes').filter((x):x is string => typeof x === 'string');
  if (!roles.length || roles.some(x => !validRoles.includes(x as InternalRoleCode))) throw new Error('Perfis invalidos');
  await assertLastAdminSafe(userId,roles as InternalRoleCode[]);
  const db = createAdminClient();
  const {data: roleRows,error:roleError} = await db.from('internal_roles').select('id,code').in('code',roles);
  if(roleError || roleRows?.length !== new Set(roles).size) throw new Error('Perfis nao encontrados');
  const {error:deleteError} = await db.from('internal_user_roles').delete().eq('internal_user_id',userId);
  if(deleteError) throw deleteError;
  const {error:insertError} = await db.from('internal_user_roles').insert((roleRows??[]).map(x=>({internal_user_id:userId,role_id:x.id,assigned_by:internalUser.id})));
  if(insertError) throw insertError;
  await recordAudit(internalUser.id,'internal_user.roles_updated',userId);
  revalidatePath('/administracao/operadores');
}
export async function blockInternalUserAction(userId:string,_form:FormData) {
  const {internalUser} = await requirePermission('internal_users.manage');
  if(userId===internalUser.id) throw new Error('Nao e permitido bloquear a propria conta.');
  await assertLastAdminSafe(userId,undefined,true);
  const {data,error} = await createAdminClient().from('internal_users').update({status:'BLOCKED'}).eq('id',userId).select('id').single();
  if(error||!data) throw new Error('Operador nao encontrado');
  await recordAudit(internalUser.id,'internal_user.blocked',userId);
  revalidatePath('/administracao/operadores');
}
export async function reactivateInternalUserAction(userId:string,_form:FormData) {
  const {internalUser} = await requirePermission('internal_users.manage');
  const {data,error} = await createAdminClient().from('internal_users').update({status:'ACTIVE'}).eq('id',userId).select('id').single();
  if(error||!data) throw new Error('Operador nao encontrado');
  await recordAudit(internalUser.id,'internal_user.reactivated',userId);
  revalidatePath('/administracao/operadores');
}
