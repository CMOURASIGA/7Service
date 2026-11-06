import { z } from 'zod';

/**
 * Variáveis de ambiente do 7Service.
 *
 * Regra de arquitetura (docs/01-architecture/SECURITY.md):
 * - Service Role nunca deve ser exposta no cliente web.
 * - Somente variáveis com prefixo NEXT_PUBLIC_ podem chegar ao browser.
 */
const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  APP_ENV: z.enum(['development', 'preview', 'production']).default('development'),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'preview', 'production']).default('development'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Env público, seguro para uso em Client Components.
 */
export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  });
}

/**
 * Env de servidor, incluindo Service Role. NUNCA importar este módulo
 * a partir de código que possa ser incluído no bundle do cliente.
 */
export function getServerEnv() {
  return serverEnvSchema.parse({
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_ENV: process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV,
  });
}

/**
 * Indica se há um projeto Supabase real configurado neste ambiente.
 *
 * Enquanto nenhum projeto for provisionado (docs/MIGRATIONS.md -
 * "Estado atual"), o 7Service roda em MODO DEMONSTRAÇÃO: navegação e
 * regras de negócio funcionam contra `src/lib/mock`, sem autenticação
 * real e sem persistência entre instâncias. Assim que as variáveis
 * NEXT_PUBLIC_SUPABASE_URL/ANON_KEY forem configuradas, esta função passa
 * a retornar `true` e a autenticação real (`src/lib/supabase`) assume —
 * sem precisar tocar em UI.
 *
 * Seguro para uso em Client e Server Components: não lança, apenas
 * verifica presença/formato.
 */
export function isSupabaseConfigured(): boolean {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  });
  return result.success;
}
