# Auditoria

## Objetivo

Permitir reconstruir quem realizou uma alteração administrativa, em qual alvo, quando e com qual resultado.

## Eventos obrigatórios

- cliente criado/alterado/suspenso;
- contrato e assinatura criados/alterados;
- limite de licença alterado;
- identidade criada, suspensa, bloqueada ou reativada;
- convite criado, enviado, reenviado, cancelado, expirado e aceito;
- acesso concedido, alterado, suspenso e revogado;
- role/entitlement alterado;
- operações administrativas de segurança;
- falhas relevantes de provisionamento.

## Estrutura conceitual

`id, occurred_at, actor_id, action, target_type, target_id, client_id, product_id, before, after, reason, correlation_id, source, metadata_safe`.

## Regras

- usuário comum não altera audit log;
- retenção será definida por política da Consult Services;
- before/after deve excluir secrets e dados desnecessários;
- busca por usuário, cliente, produto, ação e período;
- timeline de usuário/cliente é projeção amigável da auditoria, não outra fonte de verdade.
