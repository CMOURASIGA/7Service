# Licenciamento

## Objetivo

Garantir que acessos concedidos correspondam aos direitos comerciais do cliente.

## Hierarquia

Cliente -> Contrato -> Assinatura de Produto -> Plano -> Limites/Entitlements -> Acessos de Usuários.

## Regras iniciais

- assinatura deve possuir status e vigência;
- limite de usuários pode ser definido por assinatura;
- concessão de novo acesso deve validar disponibilidade;
- revogação/suspensão deve refletir no consumo conforme regra formal;
- alterações de limite são auditadas;
- nenhum frontend pode aumentar limite diretamente;
- o modelo deve aceitar métricas futuras além de usuário.

## Estados de assinatura

DRAFT, ACTIVE, SUSPENDED, EXPIRED, CANCELLED.

## Vencimento

Na primeira fase, vencimento pode gerar alerta administrativo sem suspensão automática. O desenho deve suportar políticas futuras de grace period, suspensão e reativação.

## Entitlements

Plano pode conceder módulos/features por padrão e contrato pode adicionar exceções explicitamente registradas. O cálculo de entitlement efetivo deve possuir uma única implementação de domínio para evitar divergência entre aplicações.
