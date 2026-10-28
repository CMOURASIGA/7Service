# 7Commander — inventário técnico verificado da integração com 7Service

Data: 2026-10-28. Referência: `CMOURASIGA/7Commander`, branch `develop`, arquivos consultados `lib/api-auth.ts`, `lib/supabase/server.ts` e `app/api/auth/profile/route.ts`.

## Situação observada — não está integrado

- O backend do 7Commander valida bearer JWT via `auth.getUser(token)` usando o Supabase configurado no próprio produto.
- Após a autenticação, consulta `platform_admins` e `internal_user_access` (ativas) para conceder acesso.
- A seleção do tenant depende de `TENANT_SCHEMA_READY`, `getEffectiveTenantForUser`, `CONSULT_ORG_ID` e `organization_members`. Header de organização informado pelo cliente é comparado com a organização efetiva.
- Há caminho legado de API key, restringido em Preview e no modo multiempresa. Não remover até validar impactos nos consumidores e ambiente.
- `/api/auth/profile` persiste perfil local com `user_id` derivado do JWT do produto.
- O 7Service expõe `/api/v1/authorization/memberships` e `/api/v1/authorization/decision`, autenticados com token do Supabase Auth **central**, não com o JWT emitido por outro Supabase.

**Conclusão:** não é seguro afirmar que existe SSO ou conexão funcional entre os bancos. A troca de token, IDs e políticas empresariais precisa ser desenhada e testada antes de qualquer troca no `requireApiAuth`.

## Gate I — contrato e identidade (BLOCKED)

1. Confirmar se o produto utilizará o mesmo projeto Supabase Auth central ou um broker seguro com token exchange validado e audience explícita. Não aceitar JWT do Supabase local no 7Service.
2. Inventariar operadores e usuários vinculados a `auth.users`, `platform_admins`, `internal_user_access`, `profiles` e `organization_members`.
3. Criar mapa de identidade entre IDs legados e `central_identity_id`, com conflitos a revisar e sem reconciliação por email sem verificação.
4. Mapear `organization_id` do 7Commander para `client_id` do 7Service com vínculo imutável e aprovação humana para conflitos.

## Gate II — autorização (BLOCKED)

1. Definir `productCode` real do 7Commander no catálogo central e conferir assinatura/licença e `user_product_access`.
2. Definir equivalência explícita de roles existentes (`platform_admins`, `leitor`, `colaborador`, outros roles efetivos). Não inventar novos perfis.
3. Executar `product.access` no backend antes de liberar dados; negar acesso em erro de rede, resposta malformada, identidade/empresa divergentes ou assinatura inválida.
4. Manter RBAC interno granular do 7Commander e RLS multiempresa; `product.access` central **não** substitui autorização por operação.
5. Definir estratégia de revogação sem cache prolongado, incluindo suspensão de produto sem revogar acesso aos demais.

## Gate III — implantação reversível (BLOCKED)

- Introduzir feature flag inicialmente **desligada** para modo central, com ativação apenas em ambiente de homologação.
- Preservar o fluxo de login legado até homologação e documentar rollback.
- Testes E2E: login válido/inválido, usuário sem empresa, empresa cruzada, tenant trocado, suspensão, assinatura vencida, token expirado, API central indisponível e perfil apenas leitura.
- Aplicar primeiro a usuários internos, depois a um piloto; não executar migration destrutiva de IDs nem de credenciais.

## Evidências necessárias para encerrar

- SHA testado dos dois repositórios; ambientes e origem dos tokens.
- Matriz de usuários/clientes mapeados e conflitos resolvidos sem expor dados pessoais nos relatórios.
- Cenários negativos e positivos com PASS/FAIL/BLOCKED.
- Resultado de testes, lint, typecheck, build e validação humana do fluxo real.
- Aprovação explícita antes de deploy, merge em `main` ou alterações no ambiente produtivo.

**Status:** INVENTÁRIO COMPLETO PARA OS ARQUIVOS INSPECIONADOS; INTEGRAÇÃO REAL NÃO HOMOLOGADA. Não caracteriza SPEC concluída.
