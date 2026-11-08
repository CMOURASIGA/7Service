'use client';
import { useActionState } from 'react';
import {
  reconcileContractSeats, activateContractSeats,
} from './reconciliation-actions';

type Option = { id: string; label: string };
export function ContractReconciliation({ contracts, allowCutover }: {
  contracts: Option[];
  allowCutover: boolean;
}) {
  const [status, reconcile, reconciling] = useActionState(reconcileContractSeats, { error: null });
  const [activation, activate, activating] = useActionState(activateContractSeats,{ error: null });
  const input = 'rounded-md border px-3 py-2 text-sm';
  return (
    <section className="space-y-4 rounded-lg border p-4">
      <h2 className="font-semibold">Conciliação do licenciamento existente</h2>
      <p className="text-muted text-sm">
        Compara concessões históricas e reserva os usuários nominais em modo SHADOW.
        Não altera as permissões atuais. Ativação exige migrações e homologação.
      </p>
      <form action={reconcile} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">Contrato
          <select name="contractId" required defaultValue="" className={input}>
            <option value="" disabled>Selecione</option>
            {contracts.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <button disabled={reconciling || !contracts.length}
          className="rounded-md bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50">
          {reconciling ? 'Conferindo...' : 'Conciliar licenças'}
        </button>
      </form>
      {status.error && <p role="alert" className="text-sm text-red-700">{status.error}</p>}
      {status.summary && (
        <div className="rounded-md border p-3 text-sm">
          <p>Usuários nas concessões: {status.summary.legacyUsers}</p>
          <p>Licenças reservadas: {status.summary.occupied} / {status.summary.limit}</p>
          <p>Licenças faltantes: {status.summary.missingSeats}</p>
          <p>Produtos não autorizados no contrato: {status.summary.missingProducts}</p>
          <p>Empresas fora do contrato: {status.summary.outsideCompanies}</p>
          <p>Perfis históricos conflitantes: {status.summary.conflictingRoles}</p>
          <strong>{status.summary.ready ? 'Conciliação consistente' : 'Divergências encontradas'}</strong>
        </div>
      )}
      {allowCutover ? (
        <form action={activate} className="space-y-3 rounded-md border p-3">
          <h3 className="font-medium">Ativação controlada, somente após homologação</h3>
          <label className="flex flex-col gap-1 text-sm">Contrato
            <select name="contractId" required defaultValue="" className={input}>
              <option value="" disabled>Selecione</option>
              {contracts.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Digite ATIVAR LICENCAS para confirmar
            <input name="confirmation" required className={input} autoComplete="off"/>
          </label>
          {activation.error && <p role="alert" className="text-sm text-red-700">{activation.error}</p>}
          {activation.success && <p role="status" className="text-sm">{activation.success}</p>}
          <button disabled={activating}
            className="rounded-md border border-red-700 px-3 py-2 text-sm text-red-700 disabled:opacity-50">
            {activating ? 'Ativando...' : 'Ativar controle nominal'}
          </button>
        </form>
      ) : (
        <p className="text-muted text-xs">
          Ativação indisponível até conclusão dos testes integrados. Nenhuma licença atual
          será bloqueada por esta tela.
        </p>
      )}
    </section>
  );
}
