'use client';

import { useEffect } from 'react';

import { logger } from '@/lib/logger';

/**
 * Fallback para erros que ocorrem no próprio root layout,
 * onde o boundary de error.tsx não é suficiente.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Erro crítico no root layout', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-900">7Service indisponível</h1>
        <p className="max-w-md text-sm text-slate-600">
          Não foi possível carregar a aplicação. Tente novamente em instantes.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
