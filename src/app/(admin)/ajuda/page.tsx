import Link from 'next/link';

import { requirePermission } from '@/lib/auth/session';

export const metadata = {
  title: 'Ajuda e implantação - 7Service',
};

type Step = {
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
};

const customerSteps: Step[] = [
  {
    title: 'Cadastrar o cliente',
    description:
      'Em Clientes > Novo cliente, informe os dados reais do contratante e confirme o status Ativo.',
    href: '/clientes/novo',
    linkLabel: 'Cadastrar cliente',
  },
  {
    title: 'Conferir o produto',
    description:
      'Em Produtos, confirme que o produto contratado está ativo. O cadastro no catálogo não cria a aplicação nem ativa sua integração.',
    href: '/produtos',
    linkLabel: 'Consultar produtos',
  },
  {
    title: 'Registrar contrato e assinatura',
    description:
      'Abra o cliente, registre seu contrato e adicione a assinatura do produto, plano, datas e limite de licenças.',
    href: '/clientes',
    linkLabel: 'Abrir clientes',
  },
  {
    title: 'Cadastrar ou vincular a pessoa',
    description:
      'Em Usuários, informe nome, sobrenome, e-mail e empresa. Se a pessoa já existir, vincule a mesma identidade.',
    href: '/usuarios',
    linkLabel: 'Cadastrar usuário',
  },
  {
    title: 'Conceder acesso ao produto',
    description:
      'Abra o detalhe da pessoa, confira o vínculo ativo, selecione uma assinatura elegível e atribua o papel adequado.',
    href: '/usuarios',
    linkLabel: 'Gerenciar concessões',
  },
  {
    title: 'Concluir convite e senha',
    description:
      'A pessoa aceita o convite do Supabase Auth e define ou recupera sua senha. A validade do link é do Auth.',
    href: '/convites',
    linkLabel: 'Consultar convites',
  },
  {
    title: 'Verificar provisionamento no produto',
    description:
      'No sistema contratado, confirme a conta de autenticação, o vínculo com a identidade central, a empresa e as permissões locais, quando exigidos por sua integração. O 7Service não provisiona automaticamente todos os sistemas.',
  },
  {
    title: 'Validar login e permissões',
    description:
      'Teste acesso ao produto, seleção de empresa e permissões de leitura/escrita. Registre evidência de liberação.',
  },
];

const colleagueSteps: Step[] = [
  {
    title: 'Escolher a organização existente',
    description:
      'Para colaboradores internos ou usuários de empresas existentes, use a organização já cadastrada e evite duplicidade de empresas.',
  },
  {
    title: 'Distinguir perfil interno e acesso ao produto',
    description:
      'SUPER_ADMIN no 7Service é administração interna; não equivale automaticamente a uma licença ou acesso em outro produto.',
    href: '/administracao/operadores',
    linkLabel: 'Administração interna',
  },
  {
    title: 'Configurar identidade e concessão central, se aplicável',
    description:
      'Vincule a identidade à empresa, confirme uma assinatura ativa do produto solicitado e atribua o perfil correto.',
    href: '/usuarios',
    linkLabel: 'Abrir usuários',
  },
  {
    title: 'Conferir o usuário no sistema de destino',
    description:
      'Verifique se o sistema de destino exige conta local, associação central e participação na organização. Quando não houver provisionamento automático, solicite a etapa técnica.',
  },
  {
    title: 'Testar acesso efetivo',
    description:
      'Valide os módulos do produto contratado, a organização selecionada, a troca de empresa (quando aplicável) e as restrições do papel concedido.',
  },
];

function Procedure({ title, steps }: { title: string; steps: Step[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3 rounded-lg border bg-white p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-sm font-semibold text-white">
              {index + 1}
            </span>
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-700">{step.description}</p>
              {step.href ? (
                <Link
                  href={step.href}
                  className="inline-block text-sm font-medium text-blue-700 underline"
                >
                  {step.linkLabel ?? 'Abrir tela'}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function HelpPage() {
  await requirePermission('clients.view');

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 pb-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Ajuda e procedimentos</h1>
        <p className="text-sm text-slate-700">
          Como cadastrar clientes, habilitar produtos e liberar pessoas com segurança.
        </p>
      </header>
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="font-semibold text-blue-950">Antes de começar</h2>
        <p className="mt-2 text-sm text-blue-950">
          O 7Service controla identidades, empresas, assinaturas e concessões de acesso aos
          produtos da Consult Services. Cada sistema contratado pode manter autenticação,
          organizações e permissões próprias. Cadastrar uma pessoa no 7Service não garante,
          isoladamente, o acesso ao produto. É necessário conferir a concessão e a integração
          específica de cada sistema.
        </p>
      </section>
      <Procedure title="Cenário 1. Novo cliente de qualquer produto Consult Services" steps={customerSteps} />
      <Procedure title="Cenário 2. Novo usuário de uma empresa ou produto existente" steps={colleagueSteps} />
      <section className="rounded-xl border p-5">
        <h2 className="font-semibold">Checklist de liberação</h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-700">
          <li>Empresa correta, ativa e sem duplicidade.</li>
          <li>Produto disponível, assinatura vigente e licenças suficientes.</li>
          <li>Identidade, convite e senha confirmados.</li>
          <li>Concessão central e perfil do produto coerentes.</li>
          <li>Vínculos locais do sistema de destino conferidos.</li>
          <li>Login, isolamento empresarial e permissões efetivamente testados.</li>
        </ul>
      </section>
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-amber-950">Atenção à integração de produtos</h2>
        <p className="mt-2 text-sm text-amber-950">
          Cadastrar qualquer produto no catálogo não implanta automaticamente a aplicação nem
          habilita login central. Confira o provisionamento e os requisitos técnicos de cada
          produto antes de liberar clientes. Exemplos: 7Commander e 7Clinic.
        </p>
      </section>
    </main>
  );
}
