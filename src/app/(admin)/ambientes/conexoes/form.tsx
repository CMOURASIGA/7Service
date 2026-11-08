'use client';
import { useActionState } from 'react';
import { verifyAndSaveConnection } from './actions';

export function ConnectionForm({
  environments,
}: {
  environments: { id: string; label: string }[];
}) {
  const [result, action, pending] = useActionState(verifyAndSaveConnection, { error: null });
  const input = 'rounded-md border border-border px-3 py-2 text-sm';
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4 rounded-lg border p-5">
      <h2 className="font-semibold">Conectar Supabase existente</h2>
      <p className="text-muted text-sm">
        Informe uma conexão para um ambiente já cadastrado. A credencial é enviada
        somente para a operação de servidor, verificada no Auth e armazenada criptografada.
        O 7Service não cria bancos.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Ambiente
        <select name="environmentId" required className={input} defaultValue="">
          <option value="" disabled>Selecione um ambiente</option>
          {environments.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        URL Supabase
        <input name="projectUrl" required type="url" placeholder="https://projeto.supabase.co"
          autoComplete="off" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Credencial administrativa do Supabase
        <input name="adminKey" required type="password" autoComplete="new-password"
          className={input} />
      </label>
      <p className="text-muted text-xs">
        A credencial possui privilégios elevados. Nunca a envie por chat, e-mail ou
        armazenamento público. Utilize somente a conexão protegida do 7Service.
      </p>
      {result.error && <p role="alert" className="text-sm text-red-700">{result.error}</p>}
      {result.success && <p role="status" className="text-sm">{result.success}</p>}
      <button type="submit" disabled={pending || !environments.length}
        className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
        {pending ? 'Validando...' : 'Testar e salvar conexão'}
      </button>
    </form>
  );
}
