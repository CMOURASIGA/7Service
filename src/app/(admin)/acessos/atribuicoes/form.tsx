'use client';
import { useActionState } from 'react';
import { requestContractRoleAssignment } from './actions';

type Option = { id: string; label: string; productId?: string };
const input = 'rounded-md border border-border px-3 py-2 text-sm';

export function ContractRoleAssignmentForm({
  contracts,
  identities,
  companies,
  products,
  environments,
  roles,
}: {
  contracts: Option[];
  identities: Option[];
  companies: Option[];
  products: Option[];
  environments: Option[];
  roles: Option[];
}) {
  const [status, action, pending] = useActionState(requestContractRoleAssignment, { error: null });
  const items = [
    { key: 'contractId', title: 'Contrato', options: contracts },
    { key: 'identityId', title: 'Usuário', options: identities },
    { key: 'companyId', title: 'Empresa', options: companies },
    { key: 'productId', title: 'Produto', options: products },
    { key: 'environmentId', title: 'Instalação e ambiente', options: environments },
    { key: 'roleId', title: 'Perfil', options: roles },
  ] as const;

  return (
    <form action={action} className="grid gap-4 rounded-lg border p-5 md:grid-cols-2">
      {items.map((item) => (
        <label key={item.key} className="flex flex-col gap-1 text-sm">
          {item.title}
          <select required name={item.key} defaultValue="" className={input}>
            <option value="" disabled>
              Selecione
            </option>
            {item.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <p className="text-muted text-xs md:col-span-2">
        A seleção é conferida no banco. Uma pessoa consome somente uma licença por contrato, mesmo
        com empresas e produtos diferentes. A solicitação não ativa permissões sem confirmação
        técnica do sistema de destino.
      </p>
      {status.error && (
        <p role="alert" className="text-sm text-red-700 md:col-span-2">
          {status.error}
        </p>
      )}
      {status.success && (
        <p role="status" className="text-sm md:col-span-2">
          {status.success}
        </p>
      )}
      <button
        disabled={pending || items.some((item) => !item.options.length)}
        className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:opacity-50 md:col-span-2"
      >
        {pending ? 'Conferindo contrato...' : 'Solicitar perfil no produto'}
      </button>
    </form>
  );
}
