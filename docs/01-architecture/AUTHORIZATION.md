# Autorização

## Modelo

A autorização possui dois níveis distintos.

### Administração do 7Service
Perfis internos iniciais: SUPER_ADMIN, OPERATIONS_ADMIN, SUPPORT, COMMERCIAL, FINANCE e AUDITOR. A matriz exata de permissões deverá ser configurada na implementação.

### Acesso aos produtos
Cada produto possui seus próprios roles. Role é associado ao vínculo `user_product_access`, não diretamente à identidade global.

## Decisão mínima de acesso

Uma solicitação a um produto deve considerar:

1. identidade autenticada e ativa;
2. cliente/tenant válido;
3. assinatura do produto ativa;
4. acesso do usuário ao produto ativo;
5. role/entitlement necessário à operação;
6. eventuais restrições de vigência.

## Backend como autoridade

Ocultar menu ou botão é UX, não segurança. APIs, banco e funções privilegiadas devem validar autorização.

## Privilégio mínimo

SUPPORT pode, conforme matriz, consultar usuário e iniciar recuperação sem poder alterar contrato ou licença. FINANCE não recebe automaticamente poder de conceder acesso. AUDITOR deve ser predominantemente leitura.

## Alterações

Mudanças de role, entitlement, suspensão e revogação exigem auditoria com actor e estado anterior/posterior quando aplicável.
