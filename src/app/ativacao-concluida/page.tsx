import Link from 'next/link';

export const metadata = { title: 'Conta ativada - 7Service' };

export default function ActivationCompletedPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <section className="w-full max-w-md space-y-4 rounded-lg border p-7">
        <h1 className="text-xl font-semibold">Senha cadastrada com sucesso</h1>
        <p className="text-sm">
          Sua identidade foi ativada no 7Service. Este portal possui uma área administrativa
          exclusiva para operadores internos.
        </p>
        <p className="text-sm">
          Para utilizar um produto contratado, acesse o endereço informado pelo administrador da sua
          empresa. A disponibilidade do produto depende da concessão de acesso e da confirmação do
          provisionamento.
        </p>
        <p className="text-sm">
          Não é necessário tentar entrar no painel administrativo do 7Service.
        </p>
        <Link href="/login" className="text-sm text-blue-700 underline">
          Sou administrador interno
        </Link>
      </section>
    </main>
  );
}
