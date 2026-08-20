# Roadmap - 7Service

## Fase 1 - Foundation

Objetivo: entregar a operação administrativa essencial.

Escopo: autenticação interna do 7Service, RBAC interno, clientes, catálogo de produtos, usuários, acessos por produto, roles por produto, convites, recuperação, suspensão, busca, dashboard inicial e auditoria crítica.

Critério de saída: operação consegue cadastrar cliente e usuário, conceder acesso autorizado, enviar convite, administrar estado e consultar histórico sem intervenção manual em banco.

## Fase 2 - Licensing

Objetivo: conectar acesso ao contrato comercial.

Escopo: contratos, planos, subscriptions, limites, consumo, entitlements, vigência, alertas e bloqueio backend de concessões acima do limite.

Critério de saída: nenhum acesso novo é concedido sem validação de direito comercial configurado.

## Fase 3 - Central Identity

Objetivo: tornar a identidade central efetivamente consumida pelos produtos.

Escopo: contratos de API, integração progressiva, reconciliação de usuários existentes, tokens/claims adequados, provisionamento legado temporário, eventos/outbox, SSO e revogação.

Critério de saída: pelo menos um produto opera integralmente com identidade central e existe plano validado de migração para os demais.

## Fase 4 - SaaS Operations e 7HUB

Objetivo: ampliar operação e experiência de entrada do usuário.

Escopo: 7HUB, cards dinâmicos, SSO entre produtos, métricas operacionais, alertas, suporte avançado, políticas de vencimento e automações controladas.

## Regra transversal

Fases posteriores não podem exigir reconstrução dos conceitos fundamentais de cliente, identidade, produto, assinatura, acesso e entitlement definidos desde a Fase 1.
