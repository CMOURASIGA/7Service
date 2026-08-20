# 7Service - Relacionamentos de Banco

## Objetivo

Detalhar os relacionamentos que sustentam cliente 1:1 por usuário, produto, contrato, licença, perfil e autorização.

## Diagrama conceitual

```text
clients
  1 --- N contracts
  1 --- N subscriptions
  1 --- N identities
  1 --- N client_contacts

products
  1 --- N product_roles
  1 --- N product_modules
  1 --- N product_features
  1 --- N subscriptions

contracts
  1 --- N subscriptions
  1 --- N contract_documents

subscriptions
  N --- 1 clients
  N --- 1 products
  N --- 1 plans
  1 --- N user_product_access
  1 --- N entitlements

identities
  N --- 1 clients
  1 --- N user_product_access
  1 --- N invitations

user_product_access
  N --- 1 identities
  N --- 1 subscriptions
  N --- 1 product_roles
```

## Decisão 1: identidade vinculada a um único cliente

Na versão atual do produto, cada identidade possui exatamente um `client_id` de negócio.

Não será permitido que a mesma identidade possua acesso operacional a dois clientes diferentes.

Constraint conceitual:

```text
identities.client_id NOT NULL
```

O e-mail pode até existir historicamente em outro cliente após encerramentos/migrações, mas o fluxo operacional deve impedir reutilização ambígua de identidade ativa.

## Decisão 2: acesso sempre vinculado à assinatura

`user_product_access` não deve apontar apenas para o produto. Deve apontar para a `subscription` ativa daquele cliente.

Isso permite validar:
- contrato;
- vigência;
- carência;
- limite;
- plano;
- produto;
- status comercial.

## Tabelas principais

### clients
- id uuid PK
- person_type PF/PJ
- document CPF/CNPJ
- legal_name
- trade_name
- phone
- email
- contact_name
- status
- created_at
- updated_at

### client_addresses
- id
- client_id FK
- postal_code
- street
- number
- complement
- district
- city
- state
- country

### products
- id
- code UNIQUE
- name
- description
- status
- entry_url
- login_url
- logo_path
- created_at

### product_roles
- id
- product_id FK
- code
- name
- description
- status
- UNIQUE(product_id, code)

### contracts
- id
- client_id
- reference
- start_date
- end_date
- status
- notes
- created_at

### contract_documents
- id
- contract_id
- storage_path
- original_name
- mime_type
- size_bytes
- signed_document boolean
- uploaded_at
- uploaded_by

### subscriptions
- id
- client_id
- contract_id
- product_id
- plan_id nullable
- start_date
- end_date
- grace_days default 5
- monthly_value
- implementation_value nullable
- license_limit
- status
- created_at
- updated_at

### identities
- id uuid PK
- auth_user_id UNIQUE
- client_id FK NOT NULL
- first_name
- last_name
- email
- phone nullable
- job_title nullable
- status
- activated_at nullable
- created_at
- updated_at

### user_product_access
- id
- identity_id
- subscription_id
- product_role_id
- status
- valid_from
- valid_until nullable
- suspended_at nullable
- suspended_reason nullable
- created_at
- updated_at

Restrição recomendada:

```text
UNIQUE(identity_id, subscription_id)
```

### invitations
- id
- identity_id
- token_hash
- status
- expires_at
- sent_at
- accepted_at nullable
- cancelled_at nullable
- created_by

### audit_logs
- id
- occurred_at
- actor_identity_id nullable
- action
- target_type
- target_id
- client_id nullable
- product_id nullable
- before_json nullable
- after_json nullable
- reason nullable
- correlation_id

## Status de acesso

Sugestão:
- PENDING
- ACTIVE
- SUSPENDED
- REVOKED
- EXPIRED

## Regra de licença

O consumo inicial é calculado pela quantidade de `user_product_access` que consomem licença conforme estado definido pela regra de domínio.

Para evitar corrida de concorrência, criação de acesso deve ocorrer em transação/função backend que:
1. bloqueia ou serializa a validação da assinatura;
2. conta consumo vigente;
3. valida limite;
4. cria acesso;
5. registra auditoria.

## Storage

Buckets sugeridos:
- `contract-documents` privado;
- `client-exports` privado e temporário;
- `product-assets` leitura controlada;
- `client-assets` quando necessário.

URLs de documentos sensíveis devem ser assinadas e temporárias.
