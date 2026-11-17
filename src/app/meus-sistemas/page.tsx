import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meus sistemas - 7Service' };

export default async function CustomerApplicationsPage() {
  const auth = await createClient();
  const { data, error } = await auth.auth.getUser();
  if (error || !data.user) redirect('/entrar');

  // The identity mapping is anchored in the verified server Auth UID,
  // never a URL, an email typed by the browser, or editable JWT metadata.
  const db = createAdminClient();
  const identityResult = await db
    .from('identities')
    .select('id,first_name,last_name,status')
    .eq('auth_user_id', data.user.id)
    .maybeSingle();
  if (identityResult.error || !identityResult.data) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Meu Portal</h1>
        <p>Sua conta está autenticada, mas não há identidade de cliente habilitada.</p>
      </main>
    );
  }
  const identity = identityResult.data;
  if (identity.status !== 'ACTIVE') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Meu Portal</h1>
        <p>Sua identidade ainda não está ativa. Consulte o administrador da sua empresa.</p>
      </main>
    );
  }

  const [membershipResult, grantResult] = await Promise.all([
    db
      .from('client_memberships')
      .select('client_id,status')
      .eq('identity_id', identity.id)
      .eq('status', 'ACTIVE'),
    db
      .from('user_product_access')
      .select('client_id,subscription_id,product_role_id,status')
      .eq('identity_id', identity.id)
      .in('status', ['ACTIVE', 'PENDING']),
  ]);
  if (membershipResult.error || grantResult.error) {
    throw new Error('Não foi possível consultar seus acessos.');
  }
  const clientIds = new Set((membershipResult.data ?? []).map((item) => item.client_id));
  const grants = (grantResult.data ?? []).filter((item) => clientIds.has(item.client_id));
  const subscriptionIds = [...new Set(grants.map((item) => item.subscription_id))];
  const clientIdList = [...clientIds];
  const [clientResult, subscriptionResult, roleResult] = await Promise.all([
    clientIdList.length
      ? db.from('clients').select('id,trade_name,legal_name,status').in('id', clientIdList)
      : Promise.resolve({ data: [], error: null }),
    subscriptionIds.length
      ? db
          .from('subscriptions')
          .select('id,product_id,status,start_date,end_date,grace_days')
          .in('id', subscriptionIds)
      : Promise.resolve({ data: [], error: null }),
    db.from('product_roles').select('id,name'),
  ]);
  if (clientResult.error || subscriptionResult.error || roleResult.error) {
    throw new Error('Não foi possível consultar os produtos autorizados.');
  }
  const productIds = [...new Set((subscriptionResult.data ?? []).map((item) => item.product_id))];
  const productResult = productIds.length
    ? await db.from('products').select('id,name,status').in('id', productIds)
    : { data: [], error: null };
  if (productResult.error) throw new Error('Produtos indisponíveis.');

  const clients = new Map((clientResult.data ?? []).map((item) => [item.id, item]));
  const subscriptions = new Map((subscriptionResult.data ?? []).map((item) => [item.id, item]));
  const products = new Map((productResult.data ?? []).map((item) => [item.id, item]));
  const roles = new Map((roleResult.data ?? []).map((item) => [item.id, item.name]));
  const today = new Date().toISOString().slice(0, 10);
  const visible = grants.flatMap((grant) => {
    const company = clients.get(grant.client_id);
    const subscription = subscriptions.get(grant.subscription_id);
    const product = subscription ? products.get(subscription.product_id) : null;
    const expiresAt = subscription?.end_date
      ? new Date(
          new Date(subscription.end_date + 'T00:00:00Z').getTime() +
            subscription.grace_days * 86400000,
        )
          .toISOString()
          .slice(0, 10)
      : null;
    if (
      !company ||
      !subscription ||
      !product ||
      company.status !== 'ACTIVE' ||
      subscription.status !== 'ACTIVE' ||
      product.status !== 'ACTIVE' ||
      subscription.start_date > today ||
      (expiresAt !== null && today > expiresAt)
    )
      return [];
    return [
      {
        company: company.trade_name || company.legal_name,
        product: product.name,
        role: roles.get(grant.product_role_id) || 'Perfil não identificado',
        status: grant.status,
      },
    ];
  });

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-5 p-6">
      <header className="space-y-2">
        <p className="text-sm text-slate-600">7Service | Área do usuário</p>
        <h1 className="text-2xl font-semibold">Olá, {identity.first_name}!</h1>
        <p className="text-sm text-slate-600">
          Aqui você acompanha os produtos concedidos às suas empresas. O acesso somente será
          liberado após confirmação técnica no sistema de destino.
        </p>
      </header>
      {visible.length === 0 ? (
        <section className="rounded-lg border p-5">
          <h2 className="font-semibold">Nenhum sistema disponível</h2>
          <p className="mt-2 text-sm text-slate-600">
            Sua identidade está ativa, mas ainda não há produtos concedidos e válidos. Consulte o
            administrador da sua empresa.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((item, index) => (
            <section key={item.company + item.product + index} className="rounded-lg border p-5">
              <h2 className="text-lg font-semibold">{item.product}</h2>
              <p className="mt-2 text-sm">Empresa: {item.company}</p>
              <p className="text-sm">Perfil: {item.role}</p>
              <p className="mt-2 text-sm text-amber-800">
                {item.status === 'PENDING'
                  ? 'Licença reservada. Aguardando ativação e provisionamento.'
                  : 'Autorização central ativa. Provisionamento no produto não verificado.'}
              </p>
              <button
                type="button"
                disabled
                className="mt-3 w-full rounded border p-2 text-sm opacity-60"
              >
                Acesso pendente de confirmação
              </button>
            </section>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-600">
        A autenticação no 7Service não substitui a confirmação de autorização do sistema contratado.
      </p>
      <Link href="/entrar" className="text-sm text-blue-700 underline">
        Voltar ao acesso do portal
      </Link>
    </main>
  );
}
