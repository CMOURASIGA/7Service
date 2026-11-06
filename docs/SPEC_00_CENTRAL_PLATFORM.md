# 7Service — SPEC 00: Plataforma Administrativa Central, Multiempresa e Integracoes
**Data:** 2026-10-28
**Status:** REQUISITOS DE PRODUTO DEFINIDOS; IMPLEMENTACAO E HOMOLOGACAO PENDENTES
**Escopo:** todos os produtos atuais e futuros da Consult Services.

## 1. Decisoes de produto
1. 7Service e o plano de controle administrativo privado da Consult Services. Cliente final e usuarios finais dos produtos NAO entram no painel 7Service.
2. O administrador principal designa operadores internos com permissoes individuais e auditaveis. Nao presumir que todo operador tem privilegios irrestritos.
3. Uma pessoa possui uma identidade global unica e pode pertencer a varias empresas/clientes, com acesso e perfil diferentes em cada produto e empresa.
4. O 7Service define clientes, catalogo, contratos, assinaturas, licencas, vinculos e autorizacoes. Produtos continuam responsaveis por seus dados e operacoes de negocio.
5. A futura IA administrativa usa somente APIs seguras, identidade tecnica propria e permissoes delimitadas; nao recebe acesso direto a banco nem autoridade implicita.
6. A implantacao inicia pelo 7Commander como piloto real multiempresa. Os demais produtos sao integrados progressivamente, sem migracao simultanea.
7. Somente branches develop e main. Producao requer autorizacao expressa, gates tecnicos, rastreabilidade e homologacao; nenhuma especificacao autoriza deploy automaticamente.

## 2. Modelo de dados alvo
- identities(id, auth_user_id unico, email, nome, status, ...)
- clients(id, dados cadastrais, status, ...)
- client_memberships(id, identity_id, client_id, status, dates, granted_by, ...) com UNIQUE(identity_id, client_id) no vinculo ativo conforme politica de historico
- products(id, code unico, status, ...)
- contracts e subscriptions(client_id, product_id, plan_id, license_limit, start/end, status, ...)
- user_product_access(id, membership_id, subscription_id, product_role_id, status, vigencia, ...) ligado obrigatoriamente ao MESMO client_id da subscription
- product_roles e entitlements vinculados ao produto
- audit_logs com actor, empresa/cliente de contexto, produto, alvo, before/after, motivo, correlation_id.
A identidade global nao contem client_id obrigatorio. Client membership e autorizaçao de acesso sao entidades distintas. Operadores internos sao identidades/autorizacoes separadas do acesso de cliente.

### Invariantes de seguranca
- A identidade pode ter N memberships e cada membership N acessos a produtos contratados.
- Nunca criar acesso a assinatura pertencente a outro cliente; impedir no banco e no backend.
- O contexto de empresa e explicitamente selecionado e verificado no backend em TODA leitura/escrita.
- Trocar empresa limpa caches, estados e consultas tenant-scoped; nega qualquer vazamento interempresa.
- Perfil por produto e empresa; nenhuma role global de produto concede acesso indiscriminado a outros tenants.
- Suspensao global, de membership, de subscription e de acesso por produto possuem semanticas distintas e auditoria.
- Limites de licenca validados em transacao atomica sob concorrencia.
- Migracoes de esquema, backfill e reconciliacao de usuarios legados devem ser reversiveis quando viavel, sem perda de historico, com verificacoes de integridade.

## 3. Fronteiras da plataforma
**7Service:** administracao comercial e operacional, cadastro, contratos, licencas, permissoes, auditoria, integracoes.
**Provedor de identidade:** autentica usuarios; 7Service nao armazena nem compartilha senhas. Supabase Auth permanece base inicial aprovada, sem decisao de adotar Microsoft.
**Produtos:** validam contexto, permissoes e isolamento em seus proprios backends; preservam entidades e dados funcionais.
**7HUB:** proposta separada para experiencia de entrada do usuario final; fora da entrega inicial.
**IA futura:** prevista como consumidor de API, nao implementada nesta etapa.

## 4. Contrato de integracao
Endpoint/servico de decisao recebe identity autenticada, client_id, product_code, action/permission e correlation_id. Resposta concede ou nega com reason_code, role/entitlements e versao/validade. NUNCA confiar no client_id, role ou permissoes enviados pelo navegador sem validacao. Prover consulta de empresas e produtos permitidos. Proteger API por credenciais e escopos, rate limits, logs e trilhas de auditoria. Definir mecanismo de revogacao (eventos/outbox ou versao de autorizacao e cache com TTL curto); falha de central nao concede novo acesso. Evitar chamada sincronica ao 7Service em toda operacao, desde que a revogacao seja garantida conforme SLA de seguranca a especificar e homologar.

## 5. Entregas e criterios de aceite
### SPEC 01 — Fundacao real
- Supabase real isolado por ambiente, migrations reprodutiveis, Services sem mock em producao, contratos/PDFs privados, dashboard e auditoria reais.
- Login e RBAC internos por identidade autenticada; nunca retornar SUPER_ADMIN ficticio ao ter Supabase configurado.
- Gates: lint, typecheck, testes, build, RLS real, backup/restauracao e smoke.

### SPEC 02 — Identidade multiempresa
- Uma identidade vinculada a duas ou mais empresas, com status/perfis diferentes; convites e recuperacao reais.
- Suspender/revogar vinculo A nao afeta B; trocar contexto nao mistura dados.
- Migracao controlada do modelo identity.client_id para memberships com integridade de acesso existente.

### SPEC 03 — Catalogo comercial e licencas
- Cadastros, assinatura por empresa/produto, limites atomicos, vigencia, grace period aprovado, excecao com autorizacao/motivo/auditoria.
- Sem licenca, assinatura ou permissao valida, acesso negado no backend.

### SPEC 04 — API para todos os produtos
- Contrato versionado, consulta de memberships e decisao de acesso, observabilidade, resiliencia, revogacao testada.
- Piloto: 7Commander com Consult Services e 7Consulting para um mesmo usuario, perfis independentes.

### SPEC 05 — Administracao operacional
- Operadores internos escolhidos pelo administrador principal, permissoes granulares, visao de contratos/usuarios/licencas/historico, exportacao rastreavel.
- Cliente final nao acessa /admin nem APIs administrativas.

### SPEC 06 — Homologacao e liberacao
- Matriz PASS/FAIL/BLOCKED, evidencias com SHA, testes multiempresa e de acesso negativo, integracoes, documentos privados, email real, performance e recuperacao de incidentes.
- Primeiro homologar develop, depois solicitar aprovacao explicita para main/production.

## 6. Caso de aceite prioritario: 7Commander / duas empresas
1. Administrador cria/consulta identidade global do Christian.
2. Autoriza memberships Consult Services e 7Consulting.
3. Associa 7Commander a ambas empresas com subscriptions distintas.
4. Concede perfis por empresa e produto.
5. Mesmo login abre seletor de empresa no 7Commander; cada contexto apresenta apenas seus dados.
6. Alteracao de perfil ou revogacao de uma empresa reflete-se no produto dentro do prazo de revogacao acordado sem prejudicar a outra.
7. Tentativa de forjar client_id ou utilizar UUID de outro tenant e NEGADA em APIs e banco.
8. Auditoria registra ator, contexto, alteracao e motivo.

## 7. Fora do escopo desta autorizacao
- Implementar agente de IA administrativo, Microsoft Entra ID, 7HUB, ERP/billing completo ou SSO universal agora.
- Migrar produtos em massa, criar outras branches, publicar na main/produçao.
- Atribuir a clientes do 7Service qualquer acesso ao painel interno.

## 8. Pontos tecnicos a detalhar antes de codificar SPEC 02/04
- estrategia de identificacao de empresa/tenant nos sistemas legados;
- politica de unicidade e convite para identidade global (inclusive emails preexistentes);
- politica de licenca por usuario, por empresa, por produto, e identidade do operador de suporte;
- SLA de propagacao de revogacao, cache, reconciliacao e modo de falha;
- plano de migracao sem perda de acesso e com rollback;
- permissoes exatas dos operadores e acoes que exigem dupla confirmacao.
Esses pontos exigem desenho tecnico e testes, mas nao invalidam as decisoes de produto acima.


## Adendo — decisao de infraestrutura e UX, 28/10/2026
A fase inicial adota banco de dados operacional DEDICADO por cliente, mantendo banco administrativo central separado para o 7Service. Modelo compartilhado permanece possibilidade FUTURA, nao requisito da implantacao inicial. Devem ser tratados separadamente cliente, produto, banco, deployment, URL, ambiente e permissao. Funcionalidades globais pertencem ao produto-base; personalizacoes podem ser habilitadas apenas para cliente autorizado. A estrutura de nove modulos do frontend e a ficha de cliente como centro operacional constam em `docs/SPEC_07_ENVIRONMENTS_AND_FRONTEND.md`. Nenhuma publicacao ou migracao foi autorizada.
