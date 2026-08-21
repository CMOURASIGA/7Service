'use client';

import { useEffect } from 'react';

import { logger } from '@/lib/logger';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Erro não tratado na aplicação', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-foreground text-lg font-semibold">Algo deu errado</h1>
      <p className="text-muted max-w-md text-sm">
        Ocorreu um erro inesperado. A equipe técnica já foi notificada.
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-brand-600 hover:bg-brand-700 mt-2 rounded-md px-4 py-2 text-sm font-medium text-white"
      >
        Tentar novamente
      </button>
    </div>
  );
}
