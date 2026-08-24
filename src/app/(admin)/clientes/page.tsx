import Link from 'next/link';

import { StatusBadge } from '@/components/ui/status-badge';
import { CLIENT_STATUS_LABEL } from '@/lib/status-labels';
import { listClients } from '@/services/clients';
import { getMockStore } from '@/lib/mock/store';

export const metadata = {
  title: 'Clientes - 7Service',
};

function formatDocument(document: string): string {
  if (document.length === 11) {
    return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (document.length === 14) {
    return document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return document;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const clients = listClients({
    search: params.q,
    status: params.status as never,
  });
  const store = getMockStore();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-xl font-semibold">Clientes</h1>
          <p className="text-muted text-sm">Cadastro completo, sem exclusão física</p>
        </div>
        <Link
          href="/clientes/novo"
          className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2 text-sm font-medium text-white"
        >
          Novo cliente
        </Link>
      </div>

      <form className="flex gap-2" action="/clientes">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Buscar por razão social, nome fantasia, CPF/CNPJ, e-mail ou contato"
          className="border-border focus:border-brand-600 focus:ring-brand-100 w-full max-w-md rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
        />
        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="border-border rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativo</option>
          <option value="SUSPENDED">Suspenso</option>
          <option value="CLOSED">Encerrado</option>
        </select>
        <button
          type="submit"
          className="border-border rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Filtrar
        </button>
      </form>

      {clients.length === 0 ? (
        <div className="border-border text-muted rounded-lg border border-dashed p-10 text-center text-sm">
          Nenhum cliente encontrado para os filtros aplicados.
        </div>
      ) : (
        <div className="border-border bg-background overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-border text-muted border-b bg-slate-50 text-xs">
              <tr>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Documento</th>
                <th className="px-4 py-2 font-medium">Contato principal</th>
                <th className="px-4 py-2 font-medium">Produtos ativos</th>
                <th className="px-4 py-2 font-medium">Usuários ativos</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Início</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const productsCount = new Set(
                  store.subscriptions
                    .filter((s) => s.clientId === client.id && s.status === 'ACTIVE')
                    .map((s) => s.productId),
                ).size;
                const usersCount = store.identities.filter(
                  (i) => i.clientId === client.id && i.status === 'ACTIVE',
                ).length;
                const statusInfo = CLIENT_STATUS_LABEL[client.status];

                return (
                  <tr
                    key={client.id}
                    className="border-border border-b last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/clientes/${client.id}`}
                        className="text-brand-700 font-medium hover:underline"
                      >
                        {client.tradeName || client.legalName}
                      </Link>
                    </td>
                    <td className="text-muted px-4 py-2">{formatDocument(client.document)}</td>
                    <td className="text-muted px-4 py-2">{client.contactName ?? '—'}</td>
                    <td className="text-muted px-4 py-2">{productsCount}</td>
                    <td className="text-muted px-4 py-2">{usersCount}</td>
                    <td className="px-4 py-2">
                      <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
                    </td>
                    <td className="text-muted px-4 py-2">
                      {new Date(client.relationshipStartDate).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
