import Link from 'next/link';
import { StatusBadge } from '@/components/ui/status-badge';
import { CreateProductForm } from '@/features/products/components/create-product-form';
import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Produtos - 7Service',
};

export default async function ProductsPage() {
  await requirePermission('clients.view');
  const db = await createClient();
  const { data: products, error } = await db
    .from('products')
    .select('id,name,status,description,entry_url,product_roles(id,name)')
    .order('name');
  if (error) throw new Error('Falha ao consultar catalogo de produtos');

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
              {product.product_roles.length === 0 ? (
                <span className="text-muted text-xs">Nenhum perfil cadastrado</span>
              ) : (
                product.product_roles.map((role) => (
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
