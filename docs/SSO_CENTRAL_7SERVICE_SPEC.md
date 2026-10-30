# 7Service | SPEC de identidade central para os produtos Consult Services

**Situação:** especificação técnica para implementação controlada. A integração OAuth/OIDC ainda NÃO está operacional nem homologada.

## Contrato de negócio

A Consult Services administra no 7Service: cliente ativo, contrato, assinatura, produto, implantação e URL de produção, limite de licenças, identidade do usuário, permissões por produto e revogação. O cliente usa apenas a URL do produto. A senha é cadastrada/alterada no provedor central Supabase Auth do 7Service e nunca persiste em tabelas de usuários, logs ou sistemas contratados.

O convite de ativação deve conter nome do produto, URL **da implantação específica do cliente** e instruções de primeiro acesso. O link público só pode ser enviado quando a implantação for inequívoca, ativa e HTTPS, e houver concessão efetiva. `customerProductEntryUrl` já impõe essas condições na interface administrativa do usuário.

## Solução de identidade recomendada

Supabase Auth do 7Service como provedor de identidade OIDC, por meio do recurso **OAuth 2.1 Server** do Supabase (em beta na documentação consultada em 30/10/2026). Configurar cliente OAuth distinto para 7Commander e 7Clinic, com redirect URIs exatas, PKCE, issuer e validação de JWKS, assinatura, audiência, expiração, nonce e state no consumidor. Não assumir que JWT do Supabase central é válido no Supabase separado do produto sem configurar integração OIDC adequada e a política de autenticação/autorização local.

Documentação: https://supabase.com/docs/guides/auth/oauth-server
Implementação de cliente: https://supabase.com/docs/guides/auth/oauth-server/oauth-flows
OIDC terceiro no Supabase: https://supabase.com/docs/guides/auth/third-party/custom-oidc

Requer configuração no painel Supabase, emissão/validação de tokens de forma segura, testes do retorno OAuth, mapeamento de `sub` central para usuário local e migração controlada de contas existentes. Não implantar credenciais OAuth no frontend nem registrar tokens em auditoria.

## Autorização central

O login/identidade não equivalem a permissão de uso. O produto DEVE validar identidade autenticada + vínculo no seu tenant e consultar 7Service para status do cliente, produto, contrato, assinatura, papel e concessão do usuário. O produto não deve aceitar e-mail autodeclarado do navegador, empresa informada em header sem associação verificada nem token M2M no cliente.

- 7Service tem endpoint M2M de licenciamento por produto+tenant e contrato de autorização de usuário.
- 7Commander tem consumidor de autorização com flag `SERVICE_7SERVICE_ENFORCE_USER_ACCESS`, desativada por padrão. Consult admins não são convertidos automaticamente em clientes.
- Usuários externos sem papel local de escrita permanecem somente leitura, mesmo com autorização central positiva, até haver mapeamento formal de papéis entre sistemas.
- 7Clinic dispõe apenas de adaptador servidor, não conectado à autorização de sessão.
- Falha no serviço de autorização deve bloquear o acesso ao produto (fail closed), respeitando disponibilidade e mensagens de erro. Revogação deve valer na próxima operação protegida, sem cache positivo em cliente.

## Sequência de implementação

1. Concluir SMTP transacional e templates com OTP no Supabase do 7Service; sem isso novos usuários não conseguem confirmar credenciais de forma confiável.
2. Aplicar em homologação, após aprovação, migrations de ativação e promoção de concessões PENDING: `20261030205000_activate_identity_on_password_setup.sql` e `20261030211000_activate_pending_customer_grants.sql`.
3. Configurar Auth central como OAuth Server, cadastrar cliente 7Commander e construir callback/login federado em `develop` do produto. Testar credenciais, token, cookies, sessão e RLS sem afetar os administradores existentes.
4. Mapear o usuário do SSO com `organization_members` usando vínculo explicitamente aprovado por organização; não fazer bootstrap apenas pela igualdade de e-mail.
5. Conectar verificação de assinatura/identidade/licença no backend e no acesso a páginas e API. Habilitar flag apenas para organização QA em Preview após verificar escopo; uma flag global não deve ser habilitada sem preservar Consult admins.
6. Executar concessão, acesso por URL de produção do cliente, suspensão, revogação, sessão existente, acesso cruzado e indisponibilidade central.
7. Repetir o contrato no 7Clinic; seu MVP atual é mockado e não contém Auth de profissionais implementado. Não marcar cenário como PASS antes da integração.

## Gates e restrições

HV-05 e HV-06 já são PASS, preservar. HV-01 e HV-08 dependem de OTP funcional e validação da identidade QA. INT-7COMMANDER e INT-7CLINIC dependem de SSO e autorização do produto, portanto permanecem BLOCKED até teste real.

Publicações somente em `develop` quando CI completo (lint, typecheck, testes, build) estiver PASS e lote mínimo da política Consult for atendido. Produção / `main` exigem autorização explícita.


## Implantação do piloto por organização

No 7Commander, manter `SERVICE_7SERVICE_ENFORCE_USER_ACCESS` ausente ou `false` até a homologação E2E. Quando autorizado, configurar **também** `SERVICE_7SERVICE_PILOT_ORG_ID` com UUID exato da organização QA. A flag sozinha não libera o piloto. Para usuários externos dessa organização, exigir sessão Auth local válida, e-mail confirmado, membership ativo, token de serviço do backend e decisão de acesso vigente no 7Service. Suspensão local tem precedência.

Para evitar liberar URL incorreta, a interface 7Service usa exclusivamente uma implantação PRODUCTION + ACTIVE associada ao cliente e produto, com URL HTTPS única. Sem implantação ativa, não deve oferecer um link genérico como substituto.

O licenciamento central aplica agora `grace_days` da assinatura para determinar a janela efetiva. Não interpretar a data nominal de vencimento como bloqueio imediato quando existir carência contratual válida.

As migrations de ativação de identidade e concessão (`20261030205000`, `20261030211000`, `20261030212000`) ainda requerem execução e evidência no ambiente de homologação. A aplicação de migrations não deve ser presumida a partir de commits GitHub.
