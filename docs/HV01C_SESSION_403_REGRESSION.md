# 7Service | HV-01C, preservação da sessão QA e contrato 401/403/200

## Defeito confirmado em homologação

O login da identidade de cliente negava a administração e executava signOut indevidamente. O middleware também respondia com o JSON genérico `{"error":"Sessão necessária"}` antes de encaminhar o endpoint de verificação interna.

## Correção em develop

- Login autenticado sem permissão interna: preserva a sessão Supabase e encaminha para `/acesso-restrito`, que exibe mensagem clara de negativa e oferece saída manual.
- Middleware: encaminha `GET /api/auth/internal-access` ao próprio handler, inclusive anônimo, para que a resposta seja exatamente JSON 401, 403 ou 200, sem redirecionamento nem HTML. As outras APIs privadas continuam protegidas.
- Handler consulta `auth.getUser` e valida a permissão interna, não aceita claims de usuário enviados pelo navegador.
- Testes unitários/contrato abrangem middleware anônimo e autenticado, retorno do handler 401/403/200, negação de rotas privadas e login restrito.

## Homologação obrigatória

Alias develop deve apontar para o SHA exato do CI PASS antes de testar.

1. Sem cookies de autenticação, `GET /api/auth/internal-access` responde 401 com `{"authorized":false}`.
2. Sessão QA já existente (não recriar usuário), login aceito no Supabase, tela de acesso restrito, `GET /api/auth/internal-access` responde 403 com `{"authorized":false}`. Concessão de produto QA permanece `REVOKED`.
3. Sessão do operador interno, `GET /api/auth/internal-access` responde 200 com `{"authorized":true}`.
4. Com QA, páginas administrativas `/`, `/clientes`, `/usuarios` não exibem dados internos.
5. Botão Sair encerra a sessão; repetir teste anônimo após logout; sem vazamento de cookies, OTP ou senhas na evidência.
6. Confirmar que HTML/302/307 não são retornados pelo endpoint.

Os testes automatizados são testes de contrato, não substituem execução humana E2E com contas reais.
