# Arquitetura do 7Service

## Visão

O 7Service deve ser o control plane administrativo. A identidade e a autorização precisam evoluir para serviços centrais consumidos pelos produtos do ecossistema.

```text
                    Consult Services
                          |
                    +-----v-----+
                    | 7Service  |
                    +-----+-----+
                          |
          +---------------+---------------+
          |               |               |
       Identity        Licensing      Provisioning
          |               |               |
          +---------------+---------------+
                          |
       +---------+--------+--------+---------+
       |         |        |        |         |
 7Commander  7Finance 7Eventos CRM Flow  7Legal
                          |
                       futuros
```

O 7HUB é um consumidor da mesma identidade e dos mesmos direitos, não a fonte de autorização.

## Fonte de verdade

O banco central deve ser a fonte de verdade para:

- identidade global;
- clientes/tenants;
- catálogo de produtos;
- assinaturas e licenças;
- vínculos usuário-cliente-produto;
- perfis/roles e entitlements;
- estado de acesso;
- convites;
- auditoria administrativa.

Dados funcionais específicos continuam pertencendo a cada produto.

## Fronteira de domínio

O 7Service não deve absorver projetos do 7Commander, lançamentos do 7Finance, eventos do 7Eventos, leads do CRM Flow ou processos do 7Legal.

Centralizar identidade não significa criar um banco monolítico com todos os dados dos produtos.

## Identificador central

Cada identidade deve possuir `user_id` central imutável. Os produtos devem referenciar esse identificador para vincular seus registros funcionais ao usuário.

E-mail é atributo e credencial de descoberta, não chave relacional permanente.

## Autorização

Nenhum produto deve confiar somente em dados enviados pelo frontend. O backend deve validar token, tenant/cliente, produto, status da assinatura e entitlement necessário.

## Estratégia de integração

A migração dos sistemas atuais será progressiva. Durante a transição poderá existir provisionamento sincronizado, porém a arquitetura alvo é identidade central com validação comum.

O desenho deve evitar duplicação de senhas entre bases.

## APIs

O domínio deve expor contratos estáveis para:

- consultar identidade atual;
- consultar produtos disponíveis ao usuário;
- consultar entitlement;
- consultar tenant ativo;
- provisionar/revogar acesso;
- registrar eventos de auditoria/integracao quando aplicável.

## Eventos

Operações como `user.access.granted`, `user.access.revoked`, `subscription.suspended` e `user.suspended` devem ser modeladas para permitir propagação idempotente aos produtos.

## Ambientes

Produção e desenvolvimento devem possuir bancos, secrets, URLs e integrações isolados. Dados reais de clientes não devem ser copiados livremente para ambientes de desenvolvimento.
