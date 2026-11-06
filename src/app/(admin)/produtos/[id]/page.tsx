import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createProductRoleAction,
  createProductModuleAction,
  createProductFeatureAction,
} from './actions';

export const dynamic = 'force-dynamic';
export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('products.manage');
  const { id } = await params;
  const db = createAdminClient();
  const [product, roles, modules, features] = await Promise.all([
    db.from('products').select('id,name,code,status,description').eq('id', id).maybeSingle(),
    db.from('product_roles').select('id,code,name,status').eq('product_id', id).order('name'),
    db.from('product_modules').select('id,code,name,status').eq('product_id', id).order('name'),
    db
      .from('product_features')
      .select('id,code,name,status,module_id')
      .eq('product_id', id)
      .order('name'),
  ]);
  if (product.error || roles.error || modules.error || features.error)
    throw new Error('Falha ao consultar catálogo.');
  if (!product.data) notFound();
  const input = 'rounded border px-3 py-2 text-sm';
  return (
    <main className="flex flex-col gap-5">
      <Link href="/produtos" className="text-brand-700 text-sm underline">
        Produtos
      </Link>
      <div>
        <h1 className="text-xl font-semibold">{product.data.name}</h1>
        <p className="text-muted text-sm">
          {product.data.code} · {product.data.status}
        </p>
        <p className="text-sm">{product.data.description}</p>
      </div>
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">Perfis por produto</h2>
          <form action={createProductRoleAction.bind(null, id)} className="flex flex-col gap-2">
            <input className={input} name="code" placeholder="Código" maxLength={50} required />
            <input
              className={input}
              name="name"
              placeholder="Nome do perfil"
              maxLength={120}
              required
            />
            <button className="rounded bg-blue-700 p-2 text-sm text-white">Adicionar perfil</button>
          </form>
          <ul className="mt-3 space-y-1">
            {(roles.data ?? []).map((r) => (
              <li className="border-b py-1 text-sm" key={r.id}>
                {r.name}{' '}
                <span className="text-muted">
                  ({r.code}, {r.status})
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">Módulos</h2>
          <form action={createProductModuleAction.bind(null, id)} className="flex flex-col gap-2">
            <input className={input} name="code" placeholder="Código" maxLength={50} required />
            <input
              className={input}
              name="name"
              placeholder="Nome do módulo"
              maxLength={120}
              required
            />
            <button className="rounded bg-blue-700 p-2 text-sm text-white">Adicionar módulo</button>
          </form>
          <ul className="mt-3 space-y-1">
            {(modules.data ?? []).map((m) => (
              <li className="border-b py-1 text-sm" key={m.id}>
                {m.name}{' '}
                <span className="text-muted">
                  ({m.code}, {m.status})
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">Funcionalidades</h2>
          <form action={createProductFeatureAction.bind(null, id)} className="flex flex-col gap-2">
            <input className={input} name="code" placeholder="Código" maxLength={50} required />
            <input
              className={input}
              name="name"
              placeholder="Nome da funcionalidade"
              maxLength={120}
              required
            />
            <select className={input} name="moduleId" defaultValue="">
              <option value="">Sem módulo específico</option>
              {(modules.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button className="rounded bg-blue-700 p-2 text-sm text-white">
              Adicionar funcionalidade
            </button>
          </form>
          <ul className="mt-3 space-y-1">
            {(features.data ?? []).map((f) => (
              <li key={f.id} className="border-b py-1 text-sm">
                {f.name}{' '}
                <span className="text-muted">
                  ({f.code}, {f.status})
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
