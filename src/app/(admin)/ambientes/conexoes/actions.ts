'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  destinationAdminClient,
  sealConnectionSecret,
  validateSupabaseProjectUrl,
} from '@/lib/integrations/supabase-connector';

export type ConnectionState = { error: string | null; success?: string };
const requestSchema = z.object({
  environmentId: z.string().uuid(),
  projectUrl: z.string().min(15).max(200),
  adminKey: z.string().min(16).max(4096),
});

/** Operates exclusively on an existing project and existing 7Service environment. */
export async function verifyAndSaveConnection(
  _previous: ConnectionState,
  form: FormData,
): Promise<ConnectionState> {
  const { internalUser } = await requirePermission('clients.manage');
  const parsed = requestSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Informe ambiente, URL e credencial válidos.' };
  const { environmentId, projectUrl, adminKey } = parsed.data;
  let cleanUrl: string;
  try {
    cleanUrl = validateSupabaseProjectUrl(projectUrl);
  } catch {
    return { error: 'Informe a URL raiz HTTPS do projeto Supabase existente.' };
  }

  const db = createAdminClient();
  const { data: environment, error: environmentError } = await db
    .from('product_environments')
    .select('id,status')
    .eq('id', environmentId)
    .maybeSingle();
  if (
    environmentError ||
    !environment ||
    environment.status === 'RETIRED' ||
    environment.status === 'SUSPENDED'
  )
    return { error: 'Ambiente inexistente, suspenso ou encerrado.' };

  let encrypted: ReturnType<typeof sealConnectionSecret>;
  try {
    encrypted = sealConnectionSecret(adminKey);
  } catch {
    return { error: 'Cofre de credenciais ainda não está configurado no servidor.' };
  }

  // The key is never persisted until the destination Auth admin API verifies it.
  // No users are created, modified or read into the UI by this test.
  try {
    const remote = destinationAdminClient(cleanUrl, encrypted);
    const { error } = await remote.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) return { error: 'Não foi possível validar as permissões da conexão Supabase.' };
  } catch {
    return { error: 'Falha ao testar o Auth do ambiente informado.' };
  }

  const projectRef = new URL(cleanUrl).hostname.split('.')[0];
  const extensionDb = db as unknown as SupabaseClient;
  const { error: registrationError } = await extensionDb.rpc(
    'register_environment_connection_atomic',
    {
      p_actor: internalUser.id,
      p_environment: environmentId,
      p_project_url: cleanUrl,
      p_project_ref: projectRef,
      p_encrypted_admin_key: encrypted,
    },
  );
  if (registrationError)
    return { error: 'Conexão testada, mas não registrada. Verifique a migração e auditoria.' };
  revalidatePath('/ambientes/conexoes');
  return { error: null, success: 'Conexão verificada e registrada com credencial criptografada.' };
}

const companyBindingSchema = z.object({
  environmentId: z.string().uuid(),
  clientId: z.string().uuid(),
  remoteCompanyId: z.string().trim().min(1).max(128),
});

export async function bindExistingCompanyToEnvironment(
  _previous: ConnectionState,
  form: FormData,
): Promise<ConnectionState> {
  const { internalUser } = await requirePermission('clients.manage');
  const parsed = companyBindingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: 'Informe ambiente, empresa e identificador remoto válidos.' };
  const db = createAdminClient() as unknown as SupabaseClient;
  const { error } = await db.rpc('bind_environment_company_atomic', {
    p_actor: internalUser.id,
    p_environment: parsed.data.environmentId,
    p_client: parsed.data.clientId,
    p_remote_company: parsed.data.remoteCompanyId,
  });
  if (error) return { error: 'Empresa não vinculada. Confira implantação, conexão e unicidade.' };
  revalidatePath('/ambientes/conexoes');
  return { error: null, success: 'Empresa vinculada à instalação com registro de auditoria.' };
}
