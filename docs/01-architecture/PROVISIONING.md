# Provisionamento

## Definição

Provisionamento é o processo pelo qual uma decisão administrativa do 7Service se torna um acesso efetivo nos produtos.

## Arquitetura alvo

Produtos integrados à identidade central validam token e entitlement sem exigir criação de credencial local independente.

## Transição

Enquanto produtos legados ainda exigirem registro local, o 7Service poderá executar jobs de provisionamento. Esses jobs devem ser idempotentes, observáveis e nunca replicar senha.

## Estados de job

PENDING, PROCESSING, SUCCEEDED, FAILED, RETRYING, DEAD_LETTER.

## Idempotência

Repetir uma operação de `grant access` com a mesma chave de idempotência não pode criar usuários/acessos duplicados.

## Falhas

Falha de integração não deve deixar o operador acreditando que o acesso está pronto. A UI deve diferenciar estado administrativo desejado e estado de provisionamento quando houver sincronização externa.

## Eventos sugeridos

- identity.created
- invitation.sent
- user.activated
- user.suspended
- user.reactivated
- user.access.granted
- user.access.updated
- user.access.revoked
- subscription.activated
- subscription.suspended
- subscription.expired

Eventos devem possuir event_id, occurred_at, actor/contexto quando aplicável, schema version e correlation_id.
