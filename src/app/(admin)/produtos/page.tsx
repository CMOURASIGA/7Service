import Link from 'next/link';
import { StatusBadge } from '@/components/ui/status-badge';
import { CreateProductForm } from '@/features/products/components/create-product-form';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: 'Produtos - 7Service',
};

export default async function ProductsPage() {
  await requirePermission('clients.view');
  const db = createAdminClient();
  const { data: products, error: productsError } = await db
    .from('products')
    .select('id,name,status,description,entry_url')
    .order('name');
  if (productsError) throw new Error('Falha ao consultar catálogo de produtos.');
  const productIds = (products ?? []).map((product) => product.id);
  const { data: roles, error: rolesError } = productIds.length
    ? await db.from('product_roles').select('id,product_id,name').in('product_id', productIds)
    : { data: [], error: null };
  if (rolesError) throw new Error('Falha ao consultar perfis de produtos.');
  const rolesByProduct = new Map<string, { id: string; name: string }[]>();
  for (const role of roles ?? []) {
    const current = rolesByProduct.get(role.product_id) ?? [];
    current.push({ id: role.id, name: role.name });
    rolesByProduct.set(role.product_id, current);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-xl font-semibold">Catálogo de produtos</h1>
        <p className="text-muted text-sm">
          Cadastrável dinamicamente — nenhuma lógica comum depende de código específico por produto.
        </p>
      </div>

      <CreateProductForm />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(products ?? []).map((product) => (
          <div key={product.id} className="border-border bg-background rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-foreground font-medium">
                <Link className="text-brand-700 underline" href={`/produtos/${product.id}`}>
                  {product.name}
                </Link>
              </h2>
              <StatusBadge
                label={product.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                tone={product.status === 'ACTIVE' ? 'success' : 'neutral'}
              />
            </div>
            <p className="text-muted mb-3 text-xs">
              {product.description ?? 'Sem descrição cadastrada.'}
            </p>
            <div className="text-foreground mb-2 text-xs font-medium">Perfis</div>
            <div className="flex flex-wrap gap-1">
              {(rolesByProduct.get(product.id) ?? []).length === 0 ? (
                <span className="text-muted text-xs">Nenhum perfil cadastrado</span>
              ) : (
                (rolesByProduct.get(product.id) ?? []).map((role) => (
                  <span
                    key={role.id}
                    className="text-foreground rounded-full bg-slate-100 px-2 py-0.5 text-xs"
                  >
                    {role.name}
                  </span>
                ))
              )}
            </div>
            {product.entry_url ? (
              <p className="text-muted mt-3 text-xs">
                Entrada: <span className="text-brand-700">{product.entry_url}</span>
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
