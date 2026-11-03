# 7Service | HV-01B/C, evidências e prontidão de integração

## Escopo e requisitos da rodada

Somente branch `develop`. Após gates integrais PASS, publicar a versão candidata e confirmar o SHA efetivo da alias Vercel. Manter a identidade QA `cmourasiga@gmail.com` e seu acesso de produto `REVOKED` sem novos grants.

### Regressões automatizadas locais executadas pelo CI

- `src/app/api/auth/internal-access/route.test.ts`: resposta 401 quando sem sessão, 403 com usuário autenticado mas sem papel administrativo, 200 com operador autorizado e 503 para falha de serviço. Respostas JSON sem dados internos.
- `src/app/api/auth/logout/route.test.ts`: rejeição de origem diferente, remoção de sessão via Supabase Auth, resposta JSON sem cache, falha de logout não reportada como sucesso.
- `src/lib/auth/internal-access-status.test.ts`: casos isolados de estado 401/403/200.

Estes testes de contrato usam sessões simuladas de Auth e não substituem testes de navegador com credenciais reais. Gates RLS continuam rodando no CI.

### Homologação humana obrigatória

1. Acessar `/login` com operador administrativo existente. Confirmar dashboard, menus e presença de **Sair** em todas as páginas (desktop e mobile).
2. Clicar em **Sair**. Confirmar ocultação do dashboard durante o encerramento, resposta JSON do POST `/api/auth/logout`, redirecionamento a `/login` e recarga da página.
3. Navegar diretamente para `/`, `/clientes` e `/usuarios` sem sessão. Não exibir conteúdo interno; redirecionar para login.
4. Fazer login novamente com o mesmo operador e confirmar painel disponível.
5. Autenticar como QA existente, sem alterar sua concessão REVOKED. Verificar mensagem de negação administrativa em login e nas páginas privadas.
6. No DevTools (não enviar cookies): `GET /api/auth/internal-access` sem sessão deve resultar 401 JSON, com QA 403 JSON e operador 200 JSON. Não enviar cabeçalhos de autenticação nem payload sensível nas evidências.

### Integrações com produtos, prontidão

**7Commander:** possui adaptador servidor de autorização central e controle opcional por organização QA. Ainda falta comprovar federação segura / provisionamento da identidade no Supabase Auth do 7Commander, ativação controlada no ambiente e revogação em sessão ativa. Não habilitar a flag global sem piloto isolado. Status: NOT READY para homologação comercial integrada.

**7Clinic:** adaptadores de licenciamento e autorização de usuário existem no repositório; não estão ligados a um fluxo de login clínico real, com sessão e papéis por clínica. Não declarar autorização integrada concluída. Não gravar dados clínicos no 7Service. Status: NOT READY para homologação comercial integrada.

## Evidências a devolver

SHA da alias, URL, data/hora, CI, respostas e capturas de tela sem segredos; status PASS/FAIL/BLOCKED por HV-01B e HV-01C. O acesso QA deve permanecer REVOKED, e nenhum cenário de login em produto deve ser confundido com acesso administrativo.
