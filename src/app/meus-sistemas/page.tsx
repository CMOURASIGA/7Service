import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CommanderLaunchButton } from '@/features/portal/components/commander-launch-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meus sistemas - Access Management Service' };

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
    ? await db.from('products').select('id,name,code,status').in('id', productIds)
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
        productCode: product.code,
        role: roles.get(grant.product_role_id) || 'Perfil não identificado',
        status: grant.status,
      },
    ];
  });

  const activeCount = visible.filter((item) => item.status === 'ACTIVE').length;
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-7 sm:px-6">
      <header className="overflow-hidden rounded-2xl border border-blue-900 bg-[#082a4e] px-6 py-7 text-white shadow-sm sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.18em] text-blue-200 uppercase">
              Access Management Service | Meu Portal
            </p>
            <h1 className="text-2xl font-semibold sm:text-3xl">Olá, {identity.first_name}!</h1>
            <p className="max-w-2xl text-sm leading-6 text-blue-100">
              Consulte os produtos concedidos pelas suas empresas. Seu login é centralizado no
              Access Management Service e as permissões são verificadas individualmente em cada sistema.
            </p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-right">
            <p className="text-xs text-blue-200">Produtos com autorização central ativa</p>
            <p className="text-3xl font-semibold">{activeCount}</p>
          </div>
        </div>
      </header>
      <section className="space-y-4" aria-labelledby="my-products-heading">
        <div>
          <h2 id="my-products-heading" className="text-xl font-semibold text-slate-900">
            Meus sistemas
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Apenas produtos de empresas com vínculo e assinatura válidos são apresentados.
          </p>
        </div>
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8">
            <h3 className="text-lg font-semibold text-slate-900">Nenhum sistema disponível</h3>
            <p className="mt-2 text-sm text-slate-600">
              Sua conta está ativa, mas ainda não possui produtos autorizados. Entre em contato com
              o administrador da sua empresa.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item, index) => (
              <article
                key={item.company + item.product + index}
                className="flex min-h-64 flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-lg font-bold text-blue-800"
                      aria-hidden="true"
                    >
                      {item.product.slice(0, 1).toUpperCase()}
                    </span>
                    <span
                      className={
                        item.status === 'ACTIVE'
                          ? 'rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800'
                          : 'rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800'
                      }
                    >
                      {item.status === 'ACTIVE' ? 'Licença ativa' : 'Licença reservada'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{item.product}</h3>
                    <p className="mt-1 text-sm text-slate-600">Empresa: {item.company}</p>
                    <p className="text-sm text-slate-600">Perfil: {item.role}</p>
                  </div>
                  <p className="rounded-md bg-slate-50 p-3 text-sm leading-5 text-slate-700">
                    {item.status === 'PENDING'
                      ? 'Licença reservada. O acesso ao produto depende da ativação da conta e da autorização técnica.'
                      : 'A autorização no Access Management Service está ativa. Sua autorização central está ativa. Ao abrir o produto pelo portal, o sistema validará a identidade e as permissões no destino antes de liberar o acesso.'}
                  </p>
                </div>
                <div className="mt-4">
                  {item.productCode === 'COMMANDER7' &&
                  item.status === 'ACTIVE' &&
                  process.env.NEXT_PUBLIC_COMMANDER_SSO_ORIGIN ? (
                    <CommanderLaunchButton
                      targetOrigin={process.env.NEXT_PUBLIC_COMMANDER_SSO_ORIGIN}
                    />
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600"
                    >
                      Acesso pelo portal em preparação
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <footer className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p>
          O Access Management Service administra sua identidade e suas licenças. A entrada direta em cada sistema
          será liberada após confirmar a integração de autenticação e as permissões do produto. Você
          não precisa criar outra senha.
        </p>
        <Link href="/entrar" className="mt-2 inline-block font-medium text-blue-700 underline">
          Voltar à entrada do portal
        </Link>
      </footer>
    </main>
  );
}
