# Domínio de Entitlements

## Objetivo

Representar o que um cliente e um usuário efetivamente podem utilizar em cada produto.

## Níveis

1. assinatura autoriza o produto;
2. plano/contrato autoriza módulos/features;
3. acesso do usuário autoriza entrada no produto;
4. role e permissões definem o que o usuário pode fazer.

## Regra de efetividade

O entitlement efetivo resulta da interseção entre direito comercial e autorização do usuário. Um usuário nunca pode receber feature que a assinatura do cliente não possua.

## Gestão de perfis

Para evitar complexidade operacional, a Fase 1 deve trabalhar prioritariamente com `role por produto`. Permissões granulares e exceções por usuário só devem ser usadas quando realmente necessárias.

Isso evita transformar a tela de usuário em uma matriz extensa de dezenas de checkboxes.

## Exemplo

```text
Cliente ACME
7Commander Business
Módulos: Projetos, Relatórios, Kairos

Usuário João
Role: Gestor

Efetivo:
Produto ativo + módulos contratados + permissões do role Gestor
```

## Auditoria

Mudança de entitlement contratual ou exceção de usuário deve registrar estado anterior, novo estado, responsável e motivo.
