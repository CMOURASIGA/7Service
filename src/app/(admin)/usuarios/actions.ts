'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { trackAuthInvitation } from '@/lib/invitations/track';

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
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();
  const clientId = String(form.get('clientId') ?? '');
  if (
    !firstName ||
    !lastName ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !/^[0-9a-f-]{36}$/i.test(clientId)
  ) {
    return { error: 'Informe nome, sobrenome, e-mail e empresa válidos.' };
  }

  const db = createAdminClient();
  const { data: client, error: clientError } = await db
    .from('clients')
    .select('id,status')
    .eq('id', clientId)
    .maybeSingle();
  if (clientError || !client || client.status !== 'ACTIVE') {
    return { error: 'Empresa não encontrada ou não está ativa.' };
  }

  const lookupResult = await db
    .from('identities')
    .select('id,email,auth_user_id,status')
    .ilike('email', email)
    .maybeSingle();
  let identity = lookupResult.data;
  if (lookupResult.error) return { error: 'Falha ao pesquisar identidade global.' };
  if (identity && ['REMOVED', 'BLOCKED'].includes(identity.status)) {
    return { error: 'Identidade existente está bloqueada ou removida.' };
  }

  let createdIdentity = false;
  let createdMembership = false;
  let resentInvite = false;
  if (!identity) {
    const { data, error } = await db
      .from('identities')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        status: 'PENDING_INVITE',
        client_id: null,
      })
      .select('id,email,auth_user_id,status')
      .single();
    if (error || !data)
      return {
        error:
          error?.code === '23505'
            ? 'Já existe identidade com este e-mail; recarregue os dados.'
            : 'Falha ao cadastrar identidade global.',
      };
    identity = data;
    createdIdentity = true;
  }

  const { data: existingMembership, error: lookupMembershipError } = await db
    .from('client_memberships')
    .select('id,status')
    .eq('identity_id', identity.id)
    .eq('client_id', clientId)
    .maybeSingle();
  if (lookupMembershipError) return { error: 'Falha ao consultar o vínculo empresarial.' };
  if (existingMembership) {
    if (existingMembership.status !== 'ACTIVE') {
      return {
        error: 'Já existe um vínculo não ativo. Regularize o status antes de conceder acesso.',
      };
    }
    // An existing active membership must not block recovery of an Auth invitation.
    // Still reject duplicate membership requests when Auth is already linked.
    if (identity.auth_user_id) return { error: 'Esta pessoa já está vinculada à empresa.' };
  } else {
    const { error: membershipError } = await db.from('client_memberships').insert({
      identity_id: identity.id,
      client_id: clientId,
      status: 'ACTIVE',
      granted_by: internalUser.id,
    });
    if (membershipError)
      return { error: 'Identidade cadastrada, mas o vínculo empresarial não foi concluído.' };
    createdMembership = true;
  }

  if (!identity.auth_user_id) {
    resentInvite = !createdIdentity && !createdMembership;
    // Preview invite links must land on a public password-setup page.
    // Configure the URL under Supabase Auth > URL Configuration redirect allowlist.
    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_ENV === 'preview'
        ? 'https://7service-git-develop-christians-projects-4954426e.vercel.app'
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : ((await headers()).get('origin') ?? 'http://localhost:3000'));
    const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
      redirectTo: new URL('/aceitar-convite', siteOrigin).toString(),
    });
    if (inviteError || !invited.user) {
      return {
        error: 'Vínculo cadastrado, mas o e-mail de ativação falhou. Requer reenvio seguro.',
      };
    }
    const { data: boundIdentity, error: bindError } = await db
      .from('identities')
      .update({ auth_user_id: invited.user.id })
      .eq('id', identity.id)
      .is('auth_user_id', null)
      .select('id');
    if (bindError || boundIdentity?.length !== 1)
      return { error: 'Convite enviado, mas a identidade Auth precisa ser conciliada.' };
    try {
      await trackAuthInvitation({ identityId: identity.id, operatorId: internalUser.id });
    } catch {
      return {
        error: 'Convite enviado, mas o registro de acompanhamento falhou. Requer conciliação.',
      };
    }
  }

  const { error: auditError } = await db.from('audit_logs').insert({
    actor_internal_user_id: internalUser.id,
    action: createdIdentity
      ? 'identity.invited'
      : resentInvite
        ? 'identity.invitation_resent'
        : 'identity.membership_added',
    target_type: 'identity',
    target_id: identity.id,
    client_id: clientId,
    source: '7service',
  });
  if (auditError) return { error: 'Vínculo cadastrado, mas a auditoria não foi confirmada.' };
  revalidatePath('/usuarios');
  revalidatePath('/clientes/' + clientId);
  return {
    error: null,
    success: createdIdentity
      ? 'Identidade criada e convite solicitado.'
      : resentInvite
        ? 'Novo convite solicitado para identidade existente, mantendo o vínculo empresarial.'
        : 'Vínculo com a empresa cadastrado.',
  };
}
