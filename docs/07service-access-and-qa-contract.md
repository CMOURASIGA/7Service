# 7Service - Contrato de acesso dos clientes e homologação

## Decisão funcional

7Service é o **painel administrativo exclusivo da Consult Services**. Clientes não recebem acesso ao painel administrativo. A Consult Services administra: clientes, status contratual, produtos assinados, URL da instalação, identidades, papéis no produto, limites de licenças, concessão/revogação e auditoria.

Fluxo esperado: cliente contratado e ativo -> produto e implantação configurados -> URL aprovada de destino -> usuário vinculado à empresa -> licença e papel concedidos -> convite de ativação -> credencial confirmada no provedor de identidade -> login **na URL do produto**, onde produto/empresa/permissões são efetivamente validados.

**Não armazenar nem copiar senhas** em `public.identities`, tabelas de domínio do cliente ou integrações. O Supabase Auth conserva credenciais; tabelas de negócios contêm apenas `auth_user_id`, vínculo de cliente e autorização.

## Situação técnica presente (não confundir com homologado)

- O 7Service já possui identidades, convites, vínculos de cliente, contratos, assinaturas, licenciamento e acessos por produto.
- O endpoint machine-to-machine de licenciamento resolve empresa pela combinação produto + tenant externo, com token específico por produto, sem aceitar `clientId` arbitrário do browser.
- 7Commander e 7Clinic possuem adaptadores de consulta de licenciamento em `develop`, mas **não há comprovação de ligação dos adaptadores ao bloqueio efetivo de login/sessão/recursos**.
- Não há prova de identidade federada entre Supabase Auth do 7Service e Auth de cada aplicação. Uma conta Auth no 7Service **não cria automaticamente** conta Auth nos produtos.

## Contrato obrigatório antes dos pilotos integrados

1. Definir por produto o provedor de identidade e demonstrar assinatura, audiência, validade, isolamento por tenant e revogação de sessões. Preferência arquitetural: identidade central, **apenas** se JWT e verificação de sessão forem implementados e homologados em cada produto. Alternativa documentada: provisionamento seguro no Auth próprio do produto, com mapeamento imutável e idempotente de usuário.
2. O 7Service publica a concessão por identidade + organização + produto + papel + status e referencia a implantação/URL do produto. URL não equivale a autorização.
3. O sistema de destino autentica na sua própria URL, confirma tenant pelo contexto confiável e consulta o direito vigente. Bloquear se cliente, assinatura, licença, usuário ou vínculo estiver inativo/expirado ou se o serviço de autorização estiver indisponível (fail closed).
4. Rejeitar acesso cruzado e testes de spoofing (IDs de cliente/usuário informados pelo browser não estabelecem identidade). Nunca aceitar segredo M2M no navegador.
5. Revogação e suspensão devem ser aplicadas em novas solicitações e sessões existentes, com política explícita de cache/expiração, e provas E2E.
6. Auditoria de criação, reenvio, convite aceito, concessão, duplicidade, revogação, bloqueio e decisões de acesso sem registrar token, senha, URL assinada nem dado confidencial.

## Primeiro acesso e recuperação

- No cadastro inicial, `inviteUserByEmail` direciona à página pública `/aceitar-convite` no domínio da develop.
- Para recuperar senha de uma conta Auth já existente, utilizar `/esqueci-senha` e `/redefinir-senha` sem recriar a identidade.
- As páginas de definição de senha também aceitam **e-mail e OTP** por `verifyOtp` (tipos `invite` e `recovery`). Para isso, configurar os templates Auth > Email Templates: **Invite user** e **Reset password** com a variável de código `{{ .Token }}`, e mensagem clara com link público de entrada. NÃO colocar tokens ou senhas diretamente no link do produto.
- Exemplo de conteúdo do template de recuperação:
  `Seu código temporário de recuperação é {{ .Token }}. Acesse https://7service-git-develop-christians-projects-4954426e.vercel.app/redefinir-senha e informe e-mail + código.`
- Exemplo de convite:
  `Seu código temporário de ativação é {{ .Token }}. Acesse https://7service-git-develop-christians-projects-4954426e.vercel.app/aceitar-convite e informe e-mail + código.`
- Configurar SMTP transacional com remetente verificado no painel Supabase Auth > SMTP Settings e revisar o limite de envio. Credenciais do SMTP são segredos gerenciados pelo Supabase, não pelo código.
- Não solicitar nova emissão de código enquanto houver `429 over_email_send_rate_limit`; não criar Auth user duplicado para contornar a cota.
- Para QA isolado, `cmourasiga@gmail.com` continua uma identidade sem papel interno. Após autenticação, negar o painel administrativo, como esperado.
- Template, SMTP e limites não são modificados por migrations SQL nem pelos arquivos deste repositório. Exigem configuração administrativa e validação de entrega real.

## Matriz de aceite

- HV-01: login/logout QA e ausência de acesso administrativo.
- HV-05: PASS funcional e backend após `RETIRED`, preservar evidências.
- HV-06: PASS HTTP 401 JSON para API de PDF privada sem sessão, preservar.
- HV-08: concessão/revogação/duplicidade na base autorizativa, sem usar admin como identidade QA.
- INT-7COMMANDER: concessão no 7Service => entrada pela URL do 7Commander => acesso concedido apenas na organização licenciada => revogação bloqueia.
- INT-7CLINIC: repetir na URL do 7Clinic com papéis de clínica e limites efetivos.
- Até que os pilotos INT sejam PASS, **não declarar o produto preparado para clientes reais**.

Não executar alteração em produção ou em `main` sem autorização explícita.
