import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import {
  getProductEntitlement,
  type IntegratedProduct,
} from '@/services/integrations/product-entitlements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ clientId: string; productCode: string }> };
const PRODUCTS: IntegratedProduct[] = ['7COMMANDER', '7CLINIC'];

export async function GET(_request: Request, context: Context) {
  try {
    const { clientId, productCode } = await context.params;
    const normalized = productCode.toUpperCase();
    if (!PRODUCTS.includes(normalized as IntegratedProduct)) {
      return NextResponse.json(
        { error: 'Produto não habilitado nesta integração' },
        { status: 400 },
      );
    }
    const entitlement = await getProductEntitlement(clientId, normalized as IntegratedProduct);
    return NextResponse.json(
      { entitlement },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    const code = error instanceof AppError ? error.code : 'UNEXPECTED_ERROR';
    const status =
      code === 'UNAUTHENTICATED'
        ? 401
        : code === 'FORBIDDEN'
          ? 403
          : code === 'NOT_FOUND'
            ? 404
            : code === 'VALIDATION_ERROR'
              ? 400
              : 500;
    return NextResponse.json(
      { error: error instanceof AppError ? error.message : 'Falha ao consultar licença' },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
