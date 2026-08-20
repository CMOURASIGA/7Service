# Banco de Dados - 7Service

## Princípio

O modelo deve representar identidade, tenant, catálogo, assinatura e autorização sem acoplamento aos produtos atuais.

## Entidades propostas

### organizations / clients
Cliente/tenant contratante.

Campos conceituais: id, legal_name, trade_name, document, status, created_at, updated_at.

### client_contacts
Contatos comerciais/administrativos do cliente.

### products
Catálogo de produtos. Campos conceituais: id, code único e imutável, name, description, status, entry_url, login_url, icon/logo metadata.

### product_modules
Módulos disponibilizados por produto.

### product_features
Features controláveis por entitlement.

### plans
Planos comerciais reutilizáveis.

### contracts
Contrato do cliente, com referência externa/documental, vigência e status.

### subscriptions
Vínculo cliente-produto-plano com vigência, status e métrica de licenciamento.

### identities
Perfil de identidade central relacionado ao provedor de autenticação. Não armazenar senha em tabela de negócio.

### user_clients
Vínculo de uma identidade com cliente/tenant.

### product_roles
Perfis definidos por produto.

### permissions
Permissões normalizadas quando o produto utilizar autorização granular central.

### role_permissions
Relação entre role e permission.

### user_product_access
Entidade central de autorização: user_id, client_id, product_id, role_id, status, valid_from, valid_until e metadados.

Deve existir restrição de unicidade adequada para impedir acessos duplicados ativos incompatíveis.

### entitlements
Direitos concedidos à assinatura, cliente ou acesso do usuário. Deve suportar produto, módulo e feature.

### invitations
Convites, estado, expiração, timestamps e referência segura ao token. Não armazenar token sensível em texto puro quando puder ser armazenado hash.

### license_usage
Quando necessário, materialização/controle transacional do consumo de licenças. A fonte de cálculo deve ser bem definida para evitar contagem divergente.

### audit_logs
Actor, action, target_type, target_id, client_id, product_id opcional, before/after seguro, timestamp, correlation_id e contexto técnico permitido.

### provisioning_jobs
Fila/registro de sincronizações com produtos legados durante migração.

### integration_events
Outbox de eventos para integração confiável e idempotente.

## Regras

- UUIDs como identificadores preferenciais.
- E-mail não deve ser chave primária.
- Soft delete/status para entidades que necessitam histórico.
- Dados críticos de auditoria não devem ser removidos em cascata.
- Foreign keys e constraints devem reforçar regras de domínio.
- Toda tabela multi-tenant deve possuir política RLS compatível.
- Service Role nunca deve ser exposta no cliente web.
- Datas armazenadas em UTC, exibidas no timezone adequado.

## Multiempresa

O `client_id` deve participar das decisões de autorização. Uma identidade global não recebe automaticamente acesso a todos os clientes aos quais esteja relacionada.

## Migrações

Schema será mantido por migrations versionadas no repositório. Alterações manuais de produção devem ser evitadas e, quando emergenciais, posteriormente formalizadas em migration.
