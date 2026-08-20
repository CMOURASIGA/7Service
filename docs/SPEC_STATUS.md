# 7Service - Specification Status

**Data de referência:** 20/08/2026

## Status geral

**FASE 1 - READY FOR DEVELOPMENT**

Este documento é o gate oficial das especificações do 7Service. O desenvolvimento deve seguir os documentos marcados como APPROVED. Mudanças posteriores em regras aprovadas devem ser tratadas como alteração de especificação e registradas no repositório antes ou junto da implementação.

## Legenda

- `APPROVED` - regra definida e autorizada para implementação.
- `READY` - documento suficientemente detalhado para desenvolvimento.
- `PLANNED` - arquitetura prevista, mas fora da fase atual.
- `PENDING` - depende de decisão futura e não pode ser assumido pelo desenvolvedor.
- `OUT OF SCOPE` - não implementar na fase atual.

## 1. Produto e negócio

| Área | Status | Direção |
|---|---|---|
| Visão do 7Service | APPROVED | Painel administrativo interno da Consult Services |
| Gestão de clientes | APPROVED | Cadastro completo e histórico sem exclusão física |
| CPF/CNPJ | APPROVED | Cliente pode ser pessoa física ou jurídica |
| Contratos | APPROVED | Metadados + armazenamento privado do PDF assinado |
| Produtos | APPROVED | Catálogo dinâmico, sem hardcode dos produtos atuais |
| Valores comerciais | APPROVED | Valor mensal e implantação podem ser registrados |
| Usuário x Cliente | APPROVED | Cada usuário pertence a exatamente um cliente |
| Usuário x Produtos | APPROVED | Um usuário pode acessar vários produtos do seu cliente |
| Perfil | APPROVED | Perfil é definido por usuário e por produto |
| Licenças | APPROVED | Limite por assinatura/produto |
| Excesso de licença | APPROVED | Exceção administrativa permitida com autorização, motivo e auditoria |
| Convite | APPROVED | Link válido por 24 horas |
| Recuperação | APPROVED | Novo fluxo seguro solicitado após expiração |
| Suspensão | APPROVED | Por produto, conforme assinatura correspondente |
| Grace period | APPROVED | 5 dias após término antes do bloqueio |
| Exclusão física | OUT OF SCOPE | Não excluir dados de negócio pelo fluxo normal |
| Exportação de dados | APPROVED | Pacote de dados do cliente + registro formal de entrega/encerramento |
| 7HUB | PLANNED | Aplicação separada, orientada ao usuário final |

## 2. Arquitetura

| Área | Status |
|---|---|
| Next.js + TypeScript | APPROVED |
| Tailwind/componentização Consult Services | APPROVED |
| Supabase/PostgreSQL | APPROVED |
| Supabase Auth como base inicial | APPROVED |
| Banco central do 7Service | APPROVED |
| RLS | APPROVED |
| RBAC interno | APPROVED |
| Auditoria | APPROVED |
| Storage privado para contratos | APPROVED |
| Identidade central | APPROVED como arquitetura alvo |
| SSO | PLANNED após fundação e integração |
| Outbox/eventos de integração | PLANNED para integração |

## 3. UX/UI

| Área | Status |
|---|---|
| Identidade Consult Services | APPROVED |
| Fundo claro/branco | APPROVED |
| Azul institucional | APPROVED |
| Sem roxo estrutural | APPROVED |
| Dashboard | READY |
| Clientes | READY |
| Detalhe do cliente | READY |
| Produtos | READY |
| Contratos | READY |
| Usuários | READY |
| Detalhe do usuário | READY |
| Gestão de acesso | READY |
| Convites | READY |
| Licenciamento | READY |
| Auditoria | READY |
| Administração interna | READY |

## 4. Administração interna do 7Service

### Primeira entrega

O primeiro acesso administrativo deve suportar `SUPER_ADMIN`.

A arquitetura RBAC deve estar pronta para os perfis:

- SUPER_ADMIN
- OPERATIONS_ADMIN
- SUPPORT
- COMMERCIAL
- FINANCE
- AUDITOR

Deve existir tela administrativa para cadastrar/convidar operadores internos e atribuir perfil, sem necessidade de cadastro manual direto no Supabase.

A matriz fina de permissões pode evoluir, mas o desenvolvedor não deve substituir RBAC por flags de frontend.

## 5. Integrações

### Onda 1

**APPROVED:**

1. 7Commander
2. CRM Flow

Os dois compõem a primeira onda após a fundação do 7Service.

### Onda 2

**PLANNED:** 7Legal.

### Onda 3

**PLANNED:** 7Finance e 7Eventos.

### Regras obrigatórias

- não copiar senhas entre Supabases;
- reconciliar identidades existentes com `central_user_id`;
- preservar IDs legados quando necessários para dados funcionais;
- migrar progressivamente;
- autorização final deve ser validada no backend;
- falha de integração deve ser observável e auditável.

## 6. 7HUB

Status: `PLANNED`.

Não implementar como parte da Fase 1 do 7Service.

Direção já aprovada:

- usuário autentica com identidade central;
- visualiza apenas produtos liberados;
- cards são derivados do catálogo + entitlements;
- clique direciona ao produto;
- arquitetura deve evoluir para SSO, evitando login repetido como solução definitiva.

## 7. Itens deliberadamente pendentes

Os itens abaixo não bloqueiam a Fase 1 e não devem ser inventados pelo desenvolvedor:

- política comercial completa de cobrança automática;
- gateway de pagamento;
- política final de retenção LGPD após encerramento;
- formato jurídico definitivo do termo de entrega de dados;
- MFA obrigatório ou opcional por perfil;
- analytics avançado de consumo dos produtos;
- IA transversal do 7HUB;
- regras comerciais específicas de futuros produtos;
- estratégia final de billing do 7HUB.

Quando um item PENDING se tornar necessário, a especificação deve ser atualizada antes da implementação correspondente.

## 8. Documentos normativos da Fase 1

O desenvolvedor deve ler, no mínimo:

1. `DEV_START_HERE.md`
2. `00-product/PRODUCT_SPEC.md`
3. `00-product/PRODUCT_ROADMAP.md`
4. `01-architecture/ARCHITECTURE.md`
5. `01-architecture/DATABASE.md`
6. `01-architecture/DATABASE_RELATIONSHIPS.md`
7. `01-architecture/AUTHENTICATION.md`
8. `01-architecture/AUTHORIZATION.md`
9. `01-architecture/ACCESS_DECISION.md`
10. `01-architecture/LICENSING.md`
11. `01-architecture/PROVISIONING.md`
12. `01-architecture/SECURITY.md`
13. `01-architecture/AUDIT.md`
14. `02-design/DESIGN_SYSTEM.md`
15. `02-design/NAVIGATION.md`
16. `02-design/SCREEN_FLOWS.md`
17. `03-domains/*`
18. `phases/FASE_01_FOUNDATION.md`
19. `phases/FASE_01_ACCEPTANCE_CRITERIA.md`
20. `DEV_IMPLEMENTATION_PLAN.md`

## 9. Regras para desenvolvimento

1. Não alterar regra de negócio aprovada apenas para simplificar implementação.
2. Não hardcodar 7Commander, CRM Flow, 7Legal, 7Finance ou 7Eventos em regras comuns do domínio.
3. Não usar e-mail como chave relacional permanente.
4. Não armazenar senhas em tabelas de negócio.
5. Não expor Service Role ou secrets no frontend.
6. Não confiar em ocultação de menu/botão como autorização.
7. Não excluir fisicamente registros críticos pelo fluxo administrativo normal.
8. Não criar integrações da Onda 1 antes do gate da fundação, salvo mocks/interfaces necessários ao desenho.
9. Toda migration deve ser versionada.
10. Toda operação crítica deve gerar auditoria.
11. Toda exceção de licença deve exigir motivo e actor autorizado.
12. O sistema deve tratar loading, empty, error, forbidden e success nos fluxos relevantes.

## 10. Definition of Done da Fase 1

A Fase 1 somente pode ser considerada concluída quando:

- migrations reproduzem o banco do zero;
- RLS e RBAC foram testados;
- operador autorizado administra clientes sem SQL manual;
- produto pode ser cadastrado pelo catálogo;
- contrato e PDF privado podem ser administrados;
- assinatura por produto possui vigência, preço e licença;
- usuário é criado para exatamente um cliente;
- acessos e perfis são administrados por produto;
- limite de licença é validado no backend;
- override autorizado é auditado;
- convite de 24h funciona;
- recuperação funciona sem exposição de senha;
- suspensão por produto funciona;
- grace period de 5 dias é respeitado;
- auditoria crítica está disponível;
- operador interno pode ser administrado pela UI conforme permissão;
- exportação/encerramento possui fluxo rastreável;
- testes críticos estão aprovados;
- nenhuma credencial administrativa está versionada;
- documentação foi atualizada para refletir a implementação real.

## 11. Gate oficial

**Decisão:** `READY FOR DEVELOPMENT - FASE 1`.

A autorização acima vale exclusivamente para a construção da fundação do 7Service conforme as specs atuais. Ela não autoriza automaticamente 7HUB, SSO completo ou migração dos produtos existentes.

Após a Fase 1 passar pelos critérios de aceite, deve ser aberto um novo gate para `WAVE 01 - 7Commander + CRM Flow`.
