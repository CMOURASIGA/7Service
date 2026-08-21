# Ordem de aplicação das migrations

Este documento existe porque o 7Service está sendo desenvolvido **antes**
do provisionamento do projeto Supabase real. Todo o schema já está
versionado em `supabase/migrations`, pronto para ser aplicado assim que o
projeto existir — nenhuma migration foi aplicada ainda em ambiente algum.

## Como aplicar quando o Supabase for provisionado

```bash
supabase link --project-ref <ref-do-projeto>
supabase db push
```

Isso aplica todas as migrations abaixo, em ordem, de uma vez. Elas também
podem ser aplicadas manualmente uma a uma via SQL editor, respeitando
exatamente esta ordem (dependências de FK e de função exigem isso).

## Ordem e conteúdo

| # | Arquivo | Conteúdo | Etapa do plano |
|---|---|---|---|
| 1 | `00000000000000_bootstrap.sql` | Extensão `pgcrypto` (UUIDs) | Etapa 0 |
| 2 | `00000000000001_helpers.sql` | `set_updated_at()`, `is_internal_operator()`, `has_internal_permission()`, `current_identity_client_id()` | Etapa 2 (fundação) |
| 3 | `00000000000002_internal_rbac.sql` | `internal_roles`, `internal_permissions`, `internal_role_permissions`, `internal_users`, `internal_user_roles` + seed dos 6 perfis | Etapa 1 |
| 4 | `00000000000003_clients.sql` | `clients`, `client_addresses`, `client_contacts` | Etapa 3 |
| 5 | `00000000000004_products.sql` | `products`, `product_roles`, `product_modules`, `product_features` | Etapa 4 |
| 6 | `00000000000005_plans.sql` | `plans`, `plan_modules`, `plan_features` | Etapa 4/5 |
| 7 | `00000000000006_contracts.sql` | `contracts`, `contract_documents` | Etapa 5 |
| 8 | `00000000000007_subscriptions.sql` | `subscriptions`, `subscription_modules`, `subscription_features`, `subscription_effective_status()` | Etapa 5/6/11 |
| 9 | `00000000000008_identities.sql` | `identities` (usuários finais, 1:1 com cliente) | Etapa 7 |
| 10 | `00000000000009_user_product_access.sql` | `user_product_access`, `user_access_modules`, `user_access_features`, `license_overrides`, `subscription_license_usage()` | Etapa 6/8 |
| 11 | `00000000000010_invitations.sql` | `invitations` | Etapa 9 |
| 12 | `00000000000011_audit_logs.sql` | `audit_logs` (somente INSERT/SELECT, sem UPDATE/DELETE) | Etapa 12 |
| 13 | `00000000000012_provisioning_and_integration.sql` | `provisioning_jobs`, `integration_events` (fundação para Onda 1) | Preparação Onda 1 |
| 14 | `00000000000013_storage_buckets.sql` | Buckets privados: `contract-documents`, `client-exports`, `product-assets`, `client-assets` | Etapa 5/14 |

## Decisões registradas

- **Sem enums Postgres para status**: colunas de status usam `text` +
  `CHECK constraint`. Facilita evoluir estados sem `ALTER TYPE`, conforme
  princípio "novos produtos/estados não devem exigir alteração
  estrutural" (`docs/DEV_START_HERE.md`).
- **Grace period como função, não coluna materializada**: `subscription_effective_status()`
  calcula `ACTIVE` / `GRACE_PERIOD` / `BLOCKED` em tempo real a partir de
  `end_date + grace_days`, evitando que atraso de job deixe acesso liberado
  indevidamente (`docs/03-domains/LICENSES.md`).
- **Consumo de licença como função, não tabela mutável**: `subscription_license_usage()`
  é a única fonte de cálculo de contratado/usado/disponível, evitando
  contagem divergente entre telas (`docs/01-architecture/DATABASE_RELATIONSHIPS.md`).
- **Auditoria imutável**: `audit_logs` não tem policy de UPDATE/DELETE para
  nenhum papel, incluindo SUPER_ADMIN — apenas INSERT via service role.
- **RLS em todas as tabelas**: leitura interna é sempre condicionada a uma
  permission RBAC (`has_internal_permission`); identidades de cliente só
  leem o que é seu (`current_identity_client_id()` / `auth_user_id`).

## Estado atual

Nenhum projeto Supabase existe ainda para o 7Service. Enquanto isso, a
aplicação roda sobre uma camada de serviço com dados mockados
(`src/lib/mock`, `src/services`) que espelha exatamente estas tabelas —
ver `docs/SETUP.md`. Trocar o mock pelo Supabase real deve exigir apenas
reimplementar as funções de `src/services/*`, sem alterar UI.
