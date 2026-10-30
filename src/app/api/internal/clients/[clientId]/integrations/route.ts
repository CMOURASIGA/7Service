import { NextResponse } from 'next/server';
import {
  listClientIntegrationLinks,
  upsertClientIntegrationLink,
} from '@/services/integrations/client-links';
import { AppError } from '@/lib/errors';
import type { IntegratedProduct } from '@/services/integrations/product-entitlements';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ clientId: string }> };
function fail(error: unknown) {
  const code = error instanceof AppError ? error.code : 'UNEXPECTED_ERROR';
  const status =
    code === 'UNAUTHENTICATED'
      ? 401
      : code === 'FORBIDDEN'
        ? 403
        : code === 'NOT_FOUND'
          ? 404
          : code === 'CONFLICT'
            ? 409
            : code === 'VALIDATION_ERROR'
              ? 400
              : 500;
  return NextResponse.json(
    { error: error instanceof AppError ? error.message : 'Falha na integração' },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function GET(_request: Request, context: Context) {
  try {
    const { clientId } = await context.params;
    return NextResponse.json(
      { links: await listClientIntegrationLinks(clientId) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return fail(error);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    const { clientId } = await context.params;
    const body = (await request.json()) as {
      product: IntegratedProduct;
      externalTenantId: string;
      status: 'ACTIVE' | 'DISABLED';
    };
    const link = await upsertClientIntegrationLink({ clientId, ...body });
    return NextResponse.json({ link }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return fail(error);
  }
}
