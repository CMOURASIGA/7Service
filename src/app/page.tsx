import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

/**
 * Página raiz. O dashboard completo (Etapa 13) ainda não existe;
 * por ora confirma sessão válida e apresenta um placeholder autenticado.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-foreground text-2xl font-semibold">7Service</h1>
      <p className="text-muted max-w-md text-sm">
        Base do projeto configurada. O dashboard operacional será entregue na Etapa 13 do plano de
        implementação.
      </p>
      <p className="text-muted text-xs">Autenticado como {user.email}</p>
    </div>
  );
}
