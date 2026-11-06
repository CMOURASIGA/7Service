# 7Service — contrato de autorização v1

Estas APIs foram implementadas no código do 7Service, mas **não devem ser consideradas integradas a produtos externos sem testes entre ambientes e confirmação da identidade compartilhada**.

## Autenticação

- Envie `Authorization: Bearer <token do Supabase Auth central>`; não envie service-role a um navegador ou outro produto.
- O token é verificado junto ao provedor Auth. A identidade global e seus vínculos são obtidos no backend, nunca aceitos como afirmação de um client.
- Respostas devem usar `Cache-Control: private, no-store` para preservar revogações imediatas nas consultas à central.

## Empresas do usuário

`GET /api/v1/authorization/memberships` retorna `version: '1'` e `memberships: [{ clientId, name }]`, apenas empresas com vínculo ativo e cadastro ativo.

## Decisão de acesso

`GET /api/v1/authorization/decision?clientId=<uuid>&productCode=<codigo>&action=product.access`

Para acesso a um ambiente específico: acrescente `environmentId=<uuid>`.

Para funcionalidade exclusiva: use `action=feature.access&featureCode=<codigo>`.

Respostas negadas trazem `allowed:false` e `reasonCode` (como `AUTH_REQUIRED`, `MEMBERSHIP_INACTIVE`, `SUBSCRIPTION_INACTIVE`, `ACCESS_NOT_GRANTED`, `ENVIRONMENT_ACCESS_DENIED`, `FEATURE_NOT_ENABLED` ou `BACKEND_ERROR`). Não interpretar ausência de resposta ou erro de rede como autorização.

Respostas concedidas trazem `allowed:true`, `identityId`, `clientId`, `productCode`, `roleCodes` e `expiresInSeconds:0`. Esse valor reforça que o produto consumidor **não deve** tratar a decisão como autorização de longa duração. Produto consumidor deve validar os direitos de suas próprias operações no backend.

## Integrações e limites

- O endpoint suporta `product.access` e `feature.access`, não permissões operacionais arbitrárias.
- Cada produto ainda precisa de um contrato de identidade central, integração segura de backend, consentimento e testes de revogação/isolamento. A API central sozinha não habilita o 7Commander nem outros produtos.
- Não há declaração de rate limiting externo, SLA de revogação, cache distribuído ou contrato robusto de indisponibilidade; esses gates exigem desenho, testes e homologação.
- Nenhum recurso de produção, banco dedicado de cliente ou deploy é criado por estas rotas.
