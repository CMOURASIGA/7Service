# 7Service | Contrato de provisionamento de produtos v1

**Status:** especificação de integração, ainda não homologada.  
**Produto piloto futuro:** 7Commander, **somente após liberação do outro desenvolvedor**.  
**Banco:** usar exclusivamente os Supabases já existentes. Não criar nem substituir projetos.

## 1. Responsabilidades

7Service é a origem administrativa de contrato, licença nominal, identidade,
empresa, produto, perfil e revogação.

Cada produto é responsável por aplicar a autorização efetiva na sua base,
preservar integridade de dados, negar operações fora da empresa autorizada
e fornecer leitura autenticada do estado real.

A criação de conta no Supabase Auth **não** confirma o acesso ao produto.

## 2. Duas RPCs padronizadas (backend do produto)

As RPCs de destino devem receber um JSONB por parâmetro
`p_payload` (sem credenciais ou passwords). São chamadas apenas
pela API administrativa do 7Service, com uma credencial protegida no servidor:

- `service_apply_profile_v1(p_payload jsonb) -> jsonb`: aplica uma concessão,
  mudança de perfil ou revogação por empresa e usuário.
- `service_read_profile_v1(p_payload jsonb) -> jsonb`: retorna o estado
  efetivo persistido, consultado **depois** da primeira chamada.

Formato de entrada:

```json
{
  "request_id": "<uuid>",
  "central_identity_id": "<uuid>",
  "remote_auth_user_id": "<uuid>",
  "central_company_id": "<uuid>",
  "remote_company_id": "<identificador-local>",
  "product_code": "<produto>",
  "role_code": "<perfil>",
  "operation": "GRANT"
}
```

As operações futuras são `GRANT`, `CHANGE_ROLE` e `REVOKE`.

Retorno esperado:

```json
{
  "request_id": "<uuid>",
  "remote_auth_user_id": "<uuid>",
  "remote_company_id": "<identificador-local>",
  "product_code": "<produto>",
  "role_code": "<perfil-ou-null>",
  "effective": true,
  "revision": "<versao-persistida-de-ao-menos-8-caracteres>"
}
```

Para `REVOKE`, o estado efetivo precisa ser `false` e `role_code`
deve ser `null`. Uma resposta HTTP 200 sem leitura posterior autenticada
**não é aceite**.

## 3. Requisitos obrigatórios de implementação no produto

1. As RPCs são administrativas, inacessíveis a `anon` e `authenticated`.
2. Recusar identidade, empresa, produto ou perfil não mapeados.
3. Verificar autorização central vigente (licença, contrato, vínculo e identidade);
   indisponibilidade dessa verificação em operação sensível deve negar a escrita.
4. Salvar a concessão ou revogação e auditoria em uma transação, com chave
   de idempotência vinculada ao `request_id` e dados de destino.
5. Não substituir permissões de outra empresa ou outro produto.
6. Cada pessoa tem um perfil efetivo por empresa, produto e instalação.
7. Bloquear rotas administrativas locais de criação/concessão fora do 7Service.
8. Testar RBAC e RLS em todas as tabelas operacionais e APIs, inclusive
   tentativas diretas, manipulação de sessão e tenant cruzado.
9. Na revogação, impedir imediatamente ações no backend, inclusive com JWT
   anterior; não depender somente de exclusão de conta do Auth.
10. Não retornar emails, tokens, credenciais ou dados desnecessários no receipt.

## 4. Estados na orquestração do 7Service

- `PENDING`: perfil solicitado, ainda sem confirmação remota.
- `RUNNING`: processamento autorizado e iniciado.
- `RECONCILIATION_REQUIRED`: chamada externa incerta ou incompatível;
  não repetir cegamente para não duplicar operações.
- `CONFIRMED`: dados centrais permanecem válidos e o produto confirmou
  o perfil efetivo em consulta independente.
- `FAILED`: falha classificada após verificação segura.

Chaves e URLs são obtidas pelo mapeamento de ambiente do 7Service,
nunca por parâmetro arbitrário do navegador.

## 5. Critérios de aceite para 7Commander, somente na última fase

- Maria, uma licença no contrato, ADMIN no 7Commander da Empresa A,
  LEITURA no 7Commander da Empresa B.
- Maria pode receber outro perfil em outro produto contratado sem consumir
  uma segunda licença nominal do mesmo contrato.
- Não existe ADMIN e LEITURA simultaneamente para a mesma combinação
  pessoa + empresa + sistema + instalação.
- Grupo empresarial pode compartilhar instalação dedicada somente com empresas
  do mesmo grupo cobertas pelo contrato.
- Reativação, alteração e revogação aplicadas em API e banco, sem escrita local
  administrativa independente.
- Testes HTTP de 401/403, RLS por empresa, fluxo de usuário pendente,
  leitura após escrita, concorrência de licenças e auditoria completos.

## 6. Liberação

Implementação inicial somente em `develop`. Dois controles permanecem
desabilitados por padrão:

- `SERVICE_DESTINATION_PROVISIONING_ENABLED`
- `SERVICE_PRODUCT_PROFILE_PROVISIONING_ENABLED`

O corte para `ENFORCED` tem outro gate,
`SERVICE_NAMED_SEATS_CUTOVER_ENABLED`, também desabilitado.

Somente habilitar após migrações de homologação, backfill seguro,
contratos válidos, adaptador do produto funcionando e E2E PASS.
`main` de qualquer produto requer autorização específica.
