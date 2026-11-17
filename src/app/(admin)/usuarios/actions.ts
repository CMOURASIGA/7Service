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
  const subscriptionId = String(form.get('subscriptionId') ?? '').trim();
  const productRoleId = String(form.get('productRoleId') ?? '').trim();
  if (
    !firstName ||
    !lastName ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !/^[0-9a-f-]{36}$/i.test(clientId)
  ) {
    return { error: 'Informe nome, sobrenome, e-mail e empresa válidos.' };
  }

  const db = createAdminClient();
  // Do not allow a product/role to be supplied for another company. The
  // grant RPC also checks subscription, role, membership and license seats.
  if (Boolean(subscriptionId) !== Boolean(productRoleId)) {
    return { error: 'Selecione o produto e o perfil juntos.' };
  }
  if (subscriptionId) {
    const [subscription, role] = await Promise.all([
      db
        .from('subscriptions')
        .select('id,client_id,product_id,status')
        .eq('id', subscriptionId)
        .eq('client_id', clientId)
        .maybeSingle(),
      db.from('product_roles').select('id,product_id,status').eq('id', productRoleId).maybeSingle(),
    ]);
    if (
      subscription.error ||
      role.error ||
      subscription.data?.status !== 'ACTIVE' ||
      role.data?.status !== 'ACTIVE' ||
      subscription.data.product_id !== role.data.product_id
    ) {
      return { error: 'Produto ou perfil não pertence à assinatura ativa desta empresa.' };
    }
  }
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

  // A selected product is granted during registration, under the
  // subscription row lock. PENDING grants reserve seats before activation.
  // If the license ceiling is reached, no invitation is sent.
  if (subscriptionId && productRoleId) {
    const existingGrant = await db
      .from('user_product_access')
      .select('id,product_role_id,status')
      .eq('identity_id', identity.id)
      .eq('subscription_id', subscriptionId)
      .maybeSingle();
    if (existingGrant.error) {
      return { error: 'Não foi possível verificar concessões existentes.' };
    }
    if (existingGrant.data) {
      // Retrying an invitation must not duplicate reserved seats.
      if (
        existingGrant.data.product_role_id !== productRoleId ||
        !['ACTIVE', 'PENDING'].includes(existingGrant.data.status)
      ) {
        return { error: 'Já existe uma concessão diferente. Gerencie o acesso na identidade.' };
      }
    } else {
      const grant = await db.rpc('grant_product_access_atomic', {
        p_actor: internalUser.id,
        p_identity: identity.id,
        p_subscription: subscriptionId,
        p_role: productRoleId,
      });
      if (grant.error) {
        return {
          error:
            'Vínculo empresarial registrado, mas não foi possível reservar a licença. Verifique o limite e as concessões antes de reenviar convite.',
        };
      }
    }
  }

  if (!identity.auth_user_id) {
    // Existing confirmed Auth accounts must be linked rather than invited again.
    // Only an administrator with users.manage may run this flow.
    // Do not use an unconfirmed email as proof of an existing account.
    let existingAuthUserId: string | null = null;
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 500 });
      if (error || !data) {
        return { error: 'Falha ao conferir contas de autenticação existentes.' };
      }
      const matches = data.users.filter(
        (user) => user.email?.toLowerCase() === email && Boolean(user.email_confirmed_at),
      );
      if (matches.length > 1) return { error: 'Há mais de uma conta confirmada para este e-mail.' };
      if (matches.length === 1) {
        existingAuthUserId = matches[0].id;
        break;
      }
      if (data.users.length < 500) break;
      if (page === 20) {
        return { error: 'Limite de conferência de contas atingido. Procure o suporte.' };
      }
    }

    if (existingAuthUserId) {
      const { data: alreadyLinked, error: linkLookupError } = await db
        .from('identities')
        .select('id')
        .eq('auth_user_id', existingAuthUserId)
        .neq('id', identity.id)
        .limit(1);
      if (linkLookupError || (alreadyLinked?.length ?? 0) > 0) {
        return { error: 'Conta de autenticação já associada a outra identidade.' };
      }
      const { data: linked, error: linkError } = await db
        .from('identities')
        .update({
          auth_user_id: existingAuthUserId,
          status: 'ACTIVE',
          activated_at: new Date().toISOString(),
        })
        .eq('id', identity.id)
        .eq('status', 'PENDING_INVITE')
        .is('auth_user_id', null)
        .select('id');
      if (linkError || linked?.length !== 1) {
        return { error: 'Não foi possível conciliar a conta existente com a identidade.' };
      }
      identity = { ...identity, auth_user_id: existingAuthUserId, status: 'ACTIVE' };
    }
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
      ? identity.auth_user_id && !resentInvite
        ? 'identity.linked_existing_auth'
        : 'identity.invited'
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
      ? identity.auth_user_id && !resentInvite
        ? 'Identidade vinculada à conta existente, sem novo convite.'
        : 'Identidade criada e convite solicitado.'
      : resentInvite
        ? 'Novo convite solicitado para identidade existente, mantendo o vínculo empresarial.'
        : 'Vínculo com a empresa cadastrado.',
  };
}
