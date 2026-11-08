'use client';
import { useActionState } from 'react';
import { authorizeContractProduct, configureContractSeats } from './actions';
type Option = { id: string; label: string };
export function ContractLicensingForms({ contracts, groups, products }: {
  contracts: Option[]; groups: Option[]; products: Option[];
}) {
  const [seat, seatAction, seatPending] = useActionState(configureContractSeats,{ error:null });
  const [item, productAction, productPending] = useActionState(authorizeContractProduct,{ error:null });
  const input = 'rounded-md border px-3 py-2 text-sm';
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form action={seatAction} className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-semibold">Licenças nominais do contrato</h2>
        <label className="flex flex-col gap-1 text-sm">Contrato
          <select name="contractId" className={input} required defaultValue="">
            <option value="" disabled>Selecione o contrato</option>
            {contracts.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">Grupo empresarial (opcional)
          <select name="groupId" className={input} defaultValue="">
            <option value="">Somente cliente contratante</option>
            {groups.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">Quantidade de usuários
          <input name="licenseLimit" type="number" min={0} max={100000}
            required className={input}/>
        </label>
        {seat.error && <p role="alert" className="text-sm text-red-700">{seat.error}</p>}
        {seat.success && <p role="status" className="text-sm">{seat.success}</p>}
        <button disabled={seatPending || !contracts.length}
          className="rounded-md bg-blue-700 px-3 py-2 text-white disabled:opacity-50">
          {seatPending?'Salvando...':'Configurar licenças'}
        </button>
      </form>
      <form action={productAction} className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-semibold">Produtos incluídos no contrato</h2>
        <label className="flex flex-col gap-1 text-sm">Contrato
          <select name="contractId" className={input} required defaultValue="">
            <option value="" disabled>Selecione o contrato</option>
            {contracts.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">Produto
          <select name="productId" className={input} required defaultValue="">
            <option value="" disabled>Selecione o produto</option>
            {products.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        {item.error && <p role="alert" className="text-sm text-red-700">{item.error}</p>}
        {item.success && <p role="status" className="text-sm">{item.success}</p>}
        <button disabled={productPending || !contracts.length || !products.length}
          className="rounded-md bg-blue-700 px-3 py-2 text-white disabled:opacity-50">
          {productPending?'Salvando...':'Incluir produto'}
        </button>
      </form>
    </div>
  );
}
