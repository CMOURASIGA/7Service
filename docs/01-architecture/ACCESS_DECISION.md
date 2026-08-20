# Contrato de Decisão de Acesso

## Objetivo

Padronizar a pergunta que todos os produtos devem responder antes de autorizar o uso: esta identidade pode acessar este produto, neste cliente, agora?

## Entrada conceitual

- authenticated_user_id;
- client_id;
- product_code;
- permission ou action opcional;
- correlation_id.

## Validações obrigatórias

1. identidade existe;
2. identidade está ACTIVE;
3. `identity.client_id` corresponde ao cliente solicitado;
4. produto existe e está ACTIVE;
5. existe subscription do cliente para o produto;
6. subscription está ACTIVE ou dentro de GRACE_PERIOD;
7. data atual não ultrapassou `end_date + grace_days`;
8. existe `user_product_access` ACTIVE;
9. role pertence ao mesmo produto;
10. permission/entitlement, quando solicitado, está liberado.

## Saída conceitual

```json
{
  "allowed": true,
  "user_id": "uuid",
  "client_id": "uuid",
  "product_code": "7COMMANDER",
  "role": "MANAGER",
  "subscription_status": "ACTIVE",
  "entitlements": [],
  "reason_code": null
}
```

Em negativa:

```json
{
  "allowed": false,
  "reason_code": "SUBSCRIPTION_EXPIRED"
}
```

## Reason codes mínimos

- IDENTITY_NOT_FOUND
- IDENTITY_SUSPENDED
- CLIENT_MISMATCH
- PRODUCT_INACTIVE
- SUBSCRIPTION_NOT_FOUND
- SUBSCRIPTION_SUSPENDED
- SUBSCRIPTION_EXPIRED
- ACCESS_NOT_FOUND
- ACCESS_SUSPENDED
- ROLE_INVALID
- ENTITLEMENT_DENIED

## Segurança

O frontend pode usar a decisão para UX, mas cada backend protegido deve impor a validação. Não confiar em role enviada pelo navegador.

## Performance

A implementação pode utilizar claims/cache de curta duração quando seguro, mas suspensão e revogação precisam possuir estratégia para não permanecer válidas indefinidamente. A fonte de verdade continua sendo o domínio central.

## 7HUB

O 7HUB pode consultar uma operação agregada `my-products`, derivada deste mesmo domínio, para montar os cards. Essa lista não substitui a validação executada pelo produto ao receber o usuário.
