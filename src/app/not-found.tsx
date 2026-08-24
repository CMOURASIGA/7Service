import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-foreground text-lg font-semibold">Página não encontrada</h1>
      <p className="text-muted max-w-md text-sm">
        O recurso solicitado não existe ou você não possui acesso a ele.
      </p>
      <Link
        href="/"
        className="bg-brand-600 hover:bg-brand-700 mt-2 rounded-md px-4 py-2 text-sm font-medium text-white"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
