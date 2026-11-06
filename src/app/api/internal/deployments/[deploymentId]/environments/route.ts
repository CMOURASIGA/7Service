import { NextResponse } from 'next/server';
import { listProductEnvironments, createProductEnvironment } from '@/services/product-environments';
import { AppError } from '@/lib/errors';
import type { ProductEnvironmentInput } from '@/lib/environments/validation';

type Context = { params: Promise<{ deploymentId: string }> };
export const dynamic = 'force-dynamic';

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
    { error: error instanceof AppError ? error.message : 'Erro ao gerenciar ambientes' },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function GET(_request: Request, context: Context) {
  try {
    const { deploymentId } = await context.params;
    return NextResponse.json(
      { environments: await listProductEnvironments(deploymentId) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const { deploymentId } = await context.params;
    const body = (await request.json()) as ProductEnvironmentInput;
    const environment = await createProductEnvironment(deploymentId, body);
    return NextResponse.json({ environment }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
