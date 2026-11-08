# 7Service | Provisionamento centralizado | 2026-11-08

## Decisões aprovadas
- O produto chama-se **7Service** e é o único painel administrativo de usuários, empresas, produtos, contratos, perfis e concessões.
- **Nenhum banco Supabase novo** será criado. Reutilizar exclusivamente os projetos existentes, sem tocar nos dados de produção neste desenvolvimento.
- O mesmo produto pode ter instalações compartilhadas ou dedicadas. Uma instalação dedicada pode atender várias empresas do mesmo grupo.
- A unidade de autenticação técnica é o Supabase Auth de cada instalação. Uma identidade central pode corresponder a contas Auth locais distintas, sem compartilhar senhas.
- Uma licença nominal é consumida uma única vez por identidade e **contrato**, mesmo que o usuário acesse produtos, empresas e instalações distintos dentro do escopo comercial contratado.
- A mesma identidade pode ter perfis diferentes em empresas diferentes; não pode manter dois perfis efetivos simultâneos para a mesma empresa + produto + instalação.
- As permissões são concedidas explicitamente. A licença não concede acesso automático a produtos ou empresas.
- O cadastro administrativo de usuários nos sistemas finais será desabilitado na fase de adaptação dos produtos.

## Estado do repositório antes da evolução
- Clientes, produtos, contratos, assinaturas por produto, identidades, memberships, grants, ambientes e auditoria existem.
- A rotina atual usa `subscriptions.license_limit` por produto e a RPC `grant_product_access_atomic`. Não mudar suas regras antes de migrar as restrições do banco e testar o efeito nos usuários existentes.
- A tela Ambientes hoje registra metadados, não credenciais nem conexões operacionais.
- Há consulta de autorização no 7Service e integração específica com o 7Commander. Isso não equivale ao provisionamento genérico em outros Auths.

## Ordem de execução

### Pacote A: somente 7Service
1. Núcleo de regras de licença nominal por contrato e testes. **Iniciado** em `src/lib/licensing/named-seats.ts`.
2. Inventário do esquema existente e migration aditiva de contrato/grupo/empresa operacional; preservar registros atuais.
3. Mapeamento entre cliente contratante, empresa operacional, instalação e ambiente; impedir vínculos entre clientes incompatíveis.
4. Cofre de credenciais no servidor, sem retorno ao navegador; conexão em modo teste com prevenção de SSRF e validação do projeto Supabase esperado.
5. Interface para testar conexão e registrar estado técnico. Não persistir segredos em colunas textuais sem criptografia.

### Pacote B: somente 7Service
1. Motor idempotente de provisionamento com autorização administrativa e trilha de auditoria.
2. Identidade central ↔ UID Auth local por instalação; impedir associação somente por coincidência de e-mail.
3. Vincular empresas operacionais e perfis via contrato versionado de adaptador.
4. Convites, recuperação e suspensão no Auth correto; revogação e desprovisionamento de papéis sem apagar a identidade.
5. Reconciliação de estados remoto/local e filas de falha seguras.
6. Contagem nominal de licenças em transação no banco, sob concorrência. **Não** usar somente o helper TypeScript como barreira final de limite.

### Pacote C: 7Commander por último
1. Congelar integração no ponto acordado com o outro desenvolvedor; reavaliar o commit e as rotas atuais no início do pacote.
2. Desabilitar administração independente de usuários/perfis.
3. Implementar o contrato de provisionamento no backend do 7Commander e confirmar isolamento via RLS.
4. E2E: criação somente pelo 7Service, acesso a múltiplas empresas, perfis diferentes, limite de contrato e revogação mesmo com sessão aberta.
5. Testes de regressão, readiness, homologação na develop e só então pedido de autorização para produção.

## Política de entrega
- Somente branch `develop` no 7Service; não alterar main ou produção.
- Não alterar o repositório nem o banco do 7Commander antes de sua etapa explicitamente coordenada.
- Nunca armazenar `service_role` em navegador, `NEXT_PUBLIC_*`, logs ou arquivos Git.
- Todo processo de autorização deve negar acesso em caso de falha, com auditoria.
- Testes, lint, typecheck e build precisam passar antes de qualquer conclusão de pacote.

## Critério de aceite de ponta a ponta
Configurar instalação existente, registrar contrato e empresas, convidar um usuário, provisionar seu Auth correto e o perfil local, contar uma licença apesar de múltiplos produtos/empresas, impedir duplicidade de perfil, negar excesso de licenças, revogar acesso por empresa/produto, demonstrar bloqueio via API, e registrar evidências e auditoria.


## Execution update | 08/11/2026 | continued development

### Code delivered on `develop` (NOT production-approved)
- Contract named-seat rules and tests: `src/lib/licensing/named-seats*`.
- Client/product/environment deterministic routing: `src/lib/integrations/deployment-routing*`.
- Server-only encrypted credential handling: `src/lib/integrations/supabase-connector.ts`.
- Destination Auth invitation/verification/recovery adapter: `src/lib/integrations/supabase-auth-provisioner.ts`.
- Strict provisioning intent/idempotency key: `src/lib/integrations/provisioning-intent*`.
- Product entitlement adapter contract and receipt validation: `src/lib/integrations/product-provisioning-contract*`.
- Fail-closed effective-access reconciler and tests: `src/lib/integrations/provisioning-reconciliation*`.
- Administrative UI: `/clientes/grupos`, `/clientes/licencas`, `/ambientes/conexoes`, `/acessos/provisionamento`.
- Additive (staged, unapplied) SQL scripts for group membership, seat pools, connection storage, identity mapping, atomic operations, remote company mapping, and company/product/installation role assignment.

### Explicitly NOT completed
- Applying/verifying migrations to a QA/develop database.
- Authoritative backfill of existing subscriptions and historical grants.
- Activating `ENFORCED` contract-seat mode (currently `SHADOW`).
- Connecting the existing `grant_product_access_atomic` flow to the new contract-seat enforcement.
- Implementing the destination-specific product profile adapter.
- Secure end-to-end provisioning of Auth and company/profile permissions.
- Successful execution of lint, typecheck, test, integration test and full build on the **latest** commit.
- Any changes to 7Commander or production.

### Deployment validation blocker
Vercel returned build-rate-limit failures for recent commits. A previous preview compiled, but subsequent source changes need fresh CI verification. Do not equate a Vercel status of failure caused by quota with a code failure; equally, do not declare the code PASS without test evidence.

### Safety gate
`SERVICE_DESTINATION_PROVISIONING_ENABLED` defaults to disabled. Do not enable it before applying verified migrations, reconciling seats, implementing product profile adapters, and completing the E2E authorization test.


## Continuation evidence | 2026-11-08 (second development session)

**Delivered on `develop`:**
- `provisioning-reconciliation.ts` plus tests: strict mismatch handling for identity, company, role and remote receipt.
- `/acessos/provisionamento`: read-only reconciliation ledger.
- `/acessos/atribuicoes`: company/product/installation/role request UI with server-side atomic RPC, assignments remain `PENDING`.
- `/clientes/licencas`: manual SHADOW reconciliation and a separate feature-flagged cutover operation.
- `20261108182000_contract_seat_reconciliation.sql`: legacy backfill, contract-level distinct users, entitlement and company diagnostics, duplicate legacy role checks, controlled ENFORCED activation.
- `20261108181500_provisioning_reconciliation_atomic.sql`: auditable classification of uncertain Auth interactions.
- Additional checks: existing contract validity, actor permission, original-contract preservation, preventing seat release while any assignment is effective/pending.
- `npm run test:migration-safety` command for static checks (not yet run by npm on the repository).

**Verified directly against the existing 7Service schema with read-only queries:**
- Contracts: 2. Subscriptions: 3. Identities: 6. Product grants: 7.
- Unique nominal identity/contract pairs with pending/active/suspended grants: 5.
- Historical duplicate/conflicting role groups: 0. Revoked grants: 1.
- Existing data remains untouched.

**Static GitHub SQL audit:** ten staged `20261108*.sql` migration files checked; PASS for forbidden destructive DDL/DML, transaction boundaries, public writes, uniqueness/cutover gates. This does NOT prove the SQL will execute successfully in PostgreSQL.

**Unresolved release gates:**
- No migrations applied.
- No real provisioner readback or connector E2E PASS.
- Current product authorization RPC still enforces legacy per-subscription limits.
- The 7Commander destination adapter is intentionally deferred because another developer is modifying that product.
- Latest GitHub Vercel check is blocked by the account's build-rate-limit; lint, typecheck, Vitest and full build on the latest SHA are unverified.
- `SERVICE_DESTINATION_PROVISIONING_ENABLED` and `SERVICE_NAMED_SEATS_CUTOVER_ENABLED` remain disabled by default.
