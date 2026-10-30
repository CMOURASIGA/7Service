import { NextResponse } from 'next/server';
import { updateProductEnvironment, setProductEnvironmentStatus } from '@/services/product-environments';
import { AppError } from '@/lib/errors';
import type { ProductEnvironmentInput } from '@/lib/environments/validation';
import type { EnvironmentStatus } from '@/lib/environments/status';

type Context = { params: Promise<{ deploymentId: string; environmentId: string }> };
export const dynamic = 'force-dynamic';
function failure(error: unknown) {
  const code = error instanceof AppError ? error.code : 'UNEXPECTED_ERROR';
  const status = code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403 :
    code === 'NOT_FOUND' ? 404 : code === 'CONFLICT' ? 409 : code === 'VALIDATION_ERROR' ? 400 : 500;
  return NextResponse.json({ error: error instanceof AppError ? error.message : 'Falha no ambiente' }, { status });
}
export async function PATCH(request: Request, context: Context) {
  try {
    const { deploymentId, environmentId } = await context.params;
    const body = await request.json() as { action?: string; status?: EnvironmentStatus; input?: ProductEnvironmentInput };
    const db = (await import('@/lib/supabase/admin')).createAdminClient();
    const { data: existing, error } = await db.from('product_environments')
      .select('id').eq('id', environmentId).eq('deployment_id', deploymentId).single();
    if (error || !existing) throw new AppError('NOT_FOUND', 'Ambiente não pertence à implantação');
    if (body.action === 'status') {
      const environment = await setProductEnvironmentStatus(environmentId, body.status as EnvironmentStatus);
      return NextResponse.json({ environment });
    }
    if (!body.input) throw new AppError('VALIDATION_ERROR', 'Dados do ambiente ausentes');
    const environment = await updateProductEnvironment(environmentId, body.input);
    return NextResponse.json({ environment });
  } catch (error) { return failure(error); }
}
