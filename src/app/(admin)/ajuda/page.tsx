import Link from 'next/link';
import { requirePermission } from '@/lib/auth/session';

export const metadata = {
  title: 'Ajuda e implantação - 7Service',
  description: 'Orientações de cadastro, contratação, convites e acesso a produtos.',
};

type Step = { title: string; text: string; href?: string; action?: string };
function Steps({ items }: { items: Step[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={item.title} className="flex gap-3 rounded-lg border bg-white p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-sm font-semibold text-white">{index + 1}</span>
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-900">{item.title}</h3>
            <p className="text-sm text-slate-700">{item.text}</p>
            {item.href ? <Link className="inline-block text-sm font-medium text-blue-700 underline" href={item.href}>{item.action ?? 'Abrir tela'}</Link> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
const customerSteps: Step[] = [
  {title:'Cadastrar a empresa contratante',text:'Em Clientes > Novo cliente, informe os dados reais da empresa, CPF/CNPJ, contato e demais dados obrigatórios. Confirme que o cadastro ficou Ativo.',href:'/clientes/novo',action:'Cadastrar cliente'},
  {title:'Conferir o produto contratado',text:'Em Produtos, confirme que o 7Commander está ativo. Para 7Clinic, crie o produto e seus perfis somente quando o produto e sua integração estiverem preparados. O cadastro do produto não cria a aplicação.',href:'/produtos',action:'Consultar produtos'},
  {title:'Registrar contrato e assinatura',text:'Abra o detalhe do cliente, registre o contrato e depois adicione uma assinatura do produto com datas, plano e quantidade de licenças. A assinatura deve estar Ativa.',href:'/clientes',action:'Abrir clientes'},
  {title:'Cadastrar e convidar a identidade',text:'Em Usuários, informe nome, sobrenome, e-mail real e selecione a empresa. Se a identidade já existir, use o mesmo e-mail para vinculá-la, evitando uma segunda pessoa.',href:'/usuarios',action:'Cadastrar ou vincular usuário'},
  {title:'Conceder o acesso ao produto',text:'Abra o detalhe da identidade cadastrada. Confirme o vínculo da empresa, selecione uma assinatura elegível e atribua o papel do produto. Verifique licenças e status ATIVO.',href:'/usuarios',action:'Abrir usuários'},
  {title:'Concluir o convite e a senha',text:'O destinatário deve aceitar o convite do Supabase Auth e definir ou recuperar sua senha. Em Convites confira a situação administrativa; o prazo exibido não altera a validade do link do Auth.',href:'/convites',action:'Consultar convites'},
  {title:'Provisionar o usuário no sistema de destino',text:'Para 7Commander, a autenticação central não cria automaticamente o usuário local, a empresa nem os vínculos: o responsável técnico precisa conferir a conta no Auth do Commander, associação central de identidade/empresa, membership e papel local. Não entregue o acesso antes dessa validação.'},
  {title:'Validar a entrada com o usuário',text:'Faça login no produto usando a identidade autorizada, valide a empresa disponível e confirme as permissões do papel concedido. Registre o resultado no acompanhamento de implantação.'},
];
const collaboratorSteps: Step[] = [
  {title:'Verificar a organização existente',text:'Se o novo colaborador vai trabalhar na CONSULT SERVICES ou 7CONSULTING, não crie uma empresa duplicada. Confirme qual organização do 7Commander ele utilizará.'},
  {title:'Definir o tipo de acesso',text:'Operador interno do 7Service usa Administração e os papéis internos. Usuário do 7Commander exige associação à organização e permissões do Commander. SUPER_ADMIN interno não equivale automaticamente a uma licença do produto.',href:'/administracao/operadores',action:'Administração interna'},
  {title:'Registrar a identidade e a concessão, quando usar SSO central',text:'Para login central no 7Commander, siga o fluxo de cliente: identidade no 7Service, vínculo à empresa, assinatura e acesso a COMMANDER7. Cadastre vínculo adicional sem duplicar identidades.',href:'/usuarios',action:'Usuários'},
  {title:'Conferir autorização no Commander',text:'A conta local previamente provisionada, a associação de identidade central e a participação ativa na organização são obrigatórias. Essas ligações ainda exigem o procedimento técnico de provisionamento, não estão automatizadas por esta tela.'},
  {title:'Testar o perfil real',text:'Verifique abertura de Projetos, Clientes e Atividades, a troca de empresa e bloqueio de alterações quando o papel for somente leitura.'},
];
export default async function HelpPage() {
  await requirePermission('clients.view');
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 pb-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Ajuda e procedimentos</h1>
        <p className="text-sm text-slate-700">Como cadastrar clientes, habilitar produtos e liberar o acesso de pessoas sem confundir cadastro, licença e autenticação.</p>
      </header>
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="font-semibold text-blue-950">Antes de começar</h2>
        <p className="mt-2 text-sm text-blue-950">O 7Service controla empresas, identidades, assinaturas e concessões. O 7Commander mantém sua própria conta de autenticação, organização e permissões. Cadastrar uma pessoa no 7Service, isoladamente, não a libera no Commander.</p>
      </section>
      <section className="space-y-3" id="cliente">
        <h2 className="text-xl font-semibold">Cenário 1. Novo cliente que contrata 7Commander ou 7Clinic</h2>
        <p className="text-sm text-slate-600">Ordem de execução para implantação comercial. Alguns passos de integração do produto exigem provisionamento técnico.</p>
        <Steps items={customerSteps}/>
      </section>
      <section className="space-y-3" id="colaborador">
        <h2 className="text-xl font-semibold">Cenário 2. Novo usuário da Consult Services no 7Commander</h2>
        <Steps items={collaboratorSteps}/>
      </section>
      <section className="rounded-xl border p-5">
        <h2 className="font-semibold">Checklist de liberação</h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-700">
          <li>Empresa correta, ativa, sem duplicidade.</li>
          <li>Produto disponível e assinatura vigente com licenças.</li>
          <li>Identidade, convite e senha confirmados.</li>
          <li>Concessão do produto e papel compatíveis com a necessidade.</li>
          <li>Vínculos locais do sistema de destino conferidos.</li>
          <li>Login, acesso, isolamento entre empresas e limitações de escrita testados.</li>
        </ul>
      </section>
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-amber-950">Atenção ao 7Clinic</h2>
        <p className="mt-2 text-sm text-amber-950">O cadastro de um produto 7Clinic no catálogo do 7Service não cria uma instância da clínica, nem integra automaticamente usuários e autorização. Antes de oferecer o login central a uma clínica real, valide o provisionamento e a integração técnica específica do 7Clinic.</p>
      </section>
    </main>
  );
}
