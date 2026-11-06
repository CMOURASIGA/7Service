# 7Service — auditoria real de pré-publicação da develop
Data de verificação: 2026-10-28. Escopo: sistema administrativo 7Service; 7Commander e 7Clinic são pilotos, não pré-requisitos para abrir a interface do 7Service em homologação.

## Evidência objetiva

| Gate | Situação | Evidência |
|---|---|---|
| HEAD develop e CI | PASS técnico | SHA `8431ef5685515303c2c13550b4d5edf28feb532b`; run GitHub Actions `40791905739` |
| Projeto Vercel | EXISTE | `7service` / `prj_CeQBBwFkDUTX82PSksEK5JmN5iSw` |
| Deploy prévio | READY, mas NÃO é homologação funcional | `dpl_5qDfeBoMrYQ5fXZe975txHeRUTZt` corresponde a SHA anterior `84b7340e...`, não ao HEAD desta auditoria |
| Proteção de login Vercel | DESATIVADA conforme configuração do projeto | `passwordProtection.enabled=false`, `ssoProtection.enabled=false`; autenticação própria do 7Service continua obrigatória |
| Variáveis Vercel | BLOQUEADO | Consulta `filter_project_envs(decrypt=false)` devolveu `envs=[]` |
| Bootstrap operador | BLOQUEADO | `SELECT count(*) FROM public.internal_users` devolveu `0` |
| Cadastros reais para teste | NÃO EXECUTADOS | `clients`, `identities`, `subscriptions` com 0 registros no Supabase administrativo |
| Integrações de produtos | NÃO HOMOLOGADAS | Adaptação 7Commander não conectada ao login central; 7Clinic não integrado |

## Ordem exata de desbloqueio da homologação

1. **Configurar Preview para branch develop no projeto correto**, sem alterar escopo Production, com os valores oficiais do projeto Supabase administrativo: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (somente servidor) e `APP_ENV=preview`; conferir demais variáveis requeridas no código sem criar segredos fictícios.
2. **Bootstrap seguro do primeiro operador**: autenticar identidade real via Supabase Auth e vinculá-la a `internal_users` com papel de administração autorizado. Não criar e-mail/senha temporária inventada nem contornar RLS.
3. **Verificar `GET /api/health/ready`**, login, RBAC e proibição de painel a usuários finais. Health `/api/health` sozinho não confirma operacionalidade.
4. **Executar jornada UI completa**: cliente, contrato/PDF privado, produto, assinatura/licença, identidade, convite real, acesso, revogação, auditoria e exportação.
5. **Matriz multiempresa**: usuário em duas empresas, contexto segregado, testes negativos de IDOR/RLS e mudança de empresa, sem tocar banco clínico.
6. **Integrar piloto 7Commander** somente após contrato de origem da identidade e roles; piloto 7Clinic usa cadastro comercial, sem pacientes em base central.
7. **Consolidar evidências num SHA só** e confirmar recursos de Vercel, gates, políticas e autorização antes de efetuar o deploy.

## Regras de decisão

- CI PASS não implica ambiente configurado nem homologação funcional.
- Deployment READY de SHA antigo não comprova o SHA atual.
- Não fazer merge `main` nem deploy Production.
- Não anunciar SPECs 01–07 encerradas enquanto gates funcionais reais estiverem BLOCKED.
- Não cadastrar clientes fictícios em ambiente que possa tornar-se produção sem limpeza e evidências.
- Não publicar sem aprovação explícita do responsável e checagem de cotas Vercel.

**Decisão:** `DEVELOP CODE CI PASS — DEPLOY/OPERABILITY BLOCKED BY ENV + ADMIN BOOTSTRAP`.
