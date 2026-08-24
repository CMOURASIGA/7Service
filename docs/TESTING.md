# Testes - 7Service

## Camadas

| Camada | Onde | Comando | Depende de Supabase real? |
|---|---|---|---|
| Unitária | `src/**/*.test.ts` | `npm test` | Não |
| Integração (RLS/multi-tenant/IDOR) | `tests/integration/*.test.ts` | `npm run test:integration` | Não (Postgres local) |
| E2E manual (Playwright ad-hoc) | não versionado ainda | — | Não, mas hoje só cobre o modo demonstração |
| CI | `.github/workflows/ci.yml` | roda tudo acima em PR/push para `develop`/`main` | Não |

`npm run test:all` roda unitária + integração em sequência.

## Testes de integração (RLS real)

`tests/integration/setup.ts` sobe um Postgres efêmero (local ou o service
container do CI), aplica **as migrations reais** de `supabase/migrations`
na mesma ordem de produção, recria os papéis nativos do Supabase
(`anon`, `authenticated`, `service_role` — este último com `BYPASSRLS`,
igual à chave administrativa real) e semeia dois tenants determinísticos
(`tests/integration/fixtures/seed.sql`).

Os testes conectam como um login role neutro (`test_runner`, sem
privilégio próprio) e usam `SET ROLE` + `set_config('request.jwt.claim.sub', ...)`
para simular exatamente o que o PostgREST faz por trás de cada
requisição real — ou seja, a policy de RLS é exercida pela mesma engine
(Postgres) que valida em produção, não por um mock.

Cenários cobertos hoje (`tests/integration/rls.test.ts`):

- identidade do Cliente A não lê assinatura do Cliente B;
- identidade do Cliente A não altera assinatura do Cliente B mesmo
  manipulando o UUID diretamente (IDOR de escrita);
- identidade do Cliente A não lê `user_product_access` do Cliente B
  mesmo sabendo o ID (IDOR de leitura);
- identidade nunca escreve em `contracts` (exige permission interna),
  independente do tenant;
- SUPER_ADMIN lê/escreve clientes (controle positivo);
- SUPPORT lê clientes mas não escreve (sem `clients.manage` — privilégio
  mínimo);
- operador interno `BLOCKED` perde toda autorização
  (`is_internal_operator()` passa a `false`);
- `service_role` ignora RLS (bypass administrativo esperado) e é o único
  caminho de escrita em `audit_logs`;
- `anon` (sem sessão) não lê nenhum cliente nem assinatura;
- usuário autenticado comum não consegue forjar entrada em `audit_logs`.

Rodar localmente:

```bash
# Postgres local com um usuário `postgres`/senha conhecida:
sudo -u postgres psql -c "ALTER ROLE postgres WITH PASSWORD 'postgres_test_pw';"
npm run test:integration
```

## O que ainda depende do projeto Supabase real

Estes itens não são testáveis com Postgres local isolado — precisam do
projeto provisionado (`docs/MIGRATIONS.md`):

- **Storage/PDF**: isolamento de acesso a `contract-documents` via URL
  assinada é uma combinação de policy de `storage.objects` (já coberta
  pelas migrations) + comportamento real do serviço de Storage do
  Supabase (geração/expiração de URL assinada), que não existe fora da
  plataforma.
- **GoTrue/PostgREST**: emissão real de JWT, expiração de sessão,
  comportamento de `auth.uid()` a partir de um token de verdade (aqui
  simulado via GUC).
- **Limite de licença sob concorrência real**: `subscription_license_usage()`
  e a validação em `grantAccess` foram testados sequencialmente (unitário
  + integração), mas concorrência real (duas requisições simultâneas no
  limite exato) exige lock/transação validado contra o Postgres do
  projeto real sob carga, não apenas a lógica.
- **E2E automatizado em CI**: hoje há apenas testes manuais via Playwright
  rodados ad-hoc durante o desenvolvimento (não versionados como suíte).
  Uma suíte de fluxo completo (login real, convite, ativação) só faz
  sentido com Supabase Auth real por trás.

## Próximo passo

Quando o Supabase for provisionado: aplicar as migrations
(`docs/MIGRATIONS.md`), repetir os cenários acima contra o projeto real
com JWTs de verdade, adicionar teste de Storage assinado, e só então
tratar a Etapa 16 (gate) como concluída.
