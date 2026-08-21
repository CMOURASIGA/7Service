import { ClientForm } from '@/features/clients/components/client-form';

import { createClientAction } from '../actions';

export const metadata = {
  title: 'Novo cliente - 7Service',
};

export default function NewClientPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-foreground text-xl font-semibold">Novo cliente</h1>
        <p className="text-muted text-sm">
          Após salvar, você será direcionado ao detalhe do cliente para vincular contratos e
          usuários.
        </p>
      </div>

      <div className="border-border bg-background rounded-lg border p-6">
        <ClientForm action={createClientAction} submitLabel="Criar cliente" />
      </div>
    </div>
  );
}
