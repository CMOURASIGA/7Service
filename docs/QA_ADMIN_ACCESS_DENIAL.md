# HV-01 | Validação de autorização administrativa no 7Service

## Contexto
A conta QA `cmourasiga@gmail.com` é uma identidade de cliente já ativada pelo Supabase Auth. Ela não é operadora interna da Consult Services. Antes deste ajuste, um login Auth bem-sucedido redirecionava a conta para o dashboard, onde a ausência de papel interno desencadeava a tela genérica "Algo deu errado".

## Regras de aceite
1. CI em `develop` (SHA exato) com lint, typecheck, testes e build PASS; confirmar deployment READY e alias SHA.
2. Login com QA e senha previamente definida: exibir a mensagem "Esta conta não possui acesso ao painel interno do 7Service" e não renderizar shell/dashboard administrativo. Não pedir novo OTP.
3. Acesso direto por URL a `/`, `/usuarios` e `/clientes` com a sessão QA: apresentar tela "Acesso administrativo não autorizado" em vez de erro genérico; não exibir dados internos.
4. A rota `GET /api/auth/internal-access` deve retornar HTTP 403 e `authorized:false` com a sessão QA. Sem sessão, HTTP 401.
5. A API administrativa privada deve continuar rejeitando clientes e usuários anônimos. Checar que token M2M não dá acesso ao painel.
6. Conta administrativa interna ativa acessa normalmente o dashboard, com HTTP 200 na rota de verificação.
7. Link de troca de conta faz logout; redirect de login externo ou com barra invertida é rejeitado.

## Critérios de segurança
Não criar novos usuários, não pedir senha ou OTP por chat e não anexar cookies, JWTs ou credenciais nas evidências. Apenas `develop`; produção e main preservadas.

## Limite
Isto encerra apenas a regressão de autorização interna HV-01. Provisionamento/SSO no 7Commander e 7Clinic e bloqueio após revogação continuam separados da homologação de login administrativo.
