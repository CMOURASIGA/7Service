import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { setExclusiveFeatureAction } from '@/app/(admin)/clientes/[id]/features/actions';

export async function ClientFeaturesPanel({ clientId }: { clientId: string }) {
  await requirePermission('clients.view');
  let canManage = false;
  try {
    await requirePermission('products.manage');
    canManage = true;
  } catch {
    canManage = false;
  }
  const db = createAdminClient();
  const { data: subscriptions, error: subscriptionError } = await db
    .from('subscriptions')
    .select('product_id')
    .eq('client_id', clientId)
    .eq('status', 'ACTIVE');
  if (subscriptionError) throw new Error('Não foi possível consultar assinaturas.');
  const productIds = [...new Set((subscriptions ?? []).map((x) => x.product_id))];
  if (!productIds.length)
    return (
      <section className="rounded-lg border p-5">
        <h2 className="font-semibold">Funcionalidades exclusivas</h2>
        <p className="text-muted text-sm">Nenhuma assinatura ativa cadastrada.</p>
      </section>
    );
  const [features, flags, products] = await Promise.all([
    db
      .from('product_features')
      .select('id,product_id,code,name')
      .in('product_id', productIds)
      .eq('status', 'ACTIVE'),
    db.from('client_feature_flags').select('id,feature_id,enabled').eq('client_id', clientId),
    db.from('products').select('id,name').in('id', productIds),
  ]);
  if (features.error || flags.error || products.error)
    throw new Error('Falha ao consultar funcionalidades exclusivas.');
  const byId = new Map((flags.data ?? []).map((f) => [f.feature_id, f.enabled]));
  const productNames = new Map((products.data ?? []).map((p) => [p.id, p.name]));
  return (
    <section className="rounded-lg border p-5">
      <h2 className="mb-2 font-semibold">Funcionalidades exclusivas por empresa</h2>
      <p className="text-muted mb-4 text-xs">
        A ausência de configuração não libera funcionalidades exclusivas. Autorizações são
        verificadas pelo backend do produto.
      </p>
      {(features.data ?? []).length ? (
        <ul className="space-y-2">
          {(features.data ?? []).map((feature) => {
            const enabled = byId.get(feature.id) === true;
            return (
              <li
                key={feature.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{feature.name}</p>
                  <p className="text-muted text-xs">
                    {productNames.get(feature.product_id) ?? feature.product_id} / {feature.code}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs">
                    {enabled ? 'Exclusiva habilitada' : 'Não habilitada'}
                  </span>
                  {canManage ? (
                    <ConfirmAction
                      triggerLabel={enabled ? 'Desabilitar' : 'Habilitar'}
                      action={setExclusiveFeatureAction.bind(null, clientId, feature.id, !enabled)}
                      impactMessage={
                        enabled
                          ? 'Desabilita apenas nesta empresa.'
                          : 'Habilita funcionalidade para esta empresa, condicionada ao contrato.'
                      }
                      requireReason
                      tone={enabled ? 'danger' : 'default'}
                      confirmLabel={enabled ? 'Desabilitar' : 'Habilitar'}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted text-sm">
          Não há funcionalidades cadastradas para estes produtos.
        </p>
      )}
    </section>
  );
}
