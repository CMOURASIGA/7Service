import { NextResponse } from 'next/server';

/**
 * Endpoint de health check para monitoramento de infraestrutura (Vercel/uptime).
 * Não deve exigir autenticação nem expor informação sensível.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
