# 7Service - Gate de desenvolvimento antes da proxima homologacao

Branch: develop. Este documento nao autoriza deploy. Publicacao requer autorizacao explicita do responsavel.

## Criterios bloqueantes

1. Executar npm run lint, npm run typecheck, npm run test e npm run build no mesmo SHA.
2. Garantir autenticacao real e RBAC no backend para todas as operacoes administrativas.
3. PDF: contrato real existente; upload de bytes para bucket privado; metadados persistidos em banco; download assinado condicionado ao documento cadastrado; validacao de tamanho e assinatura; auditoria e cleanup em falha.
4. Ambientes: listar, criar, editar e suspender pela interface; verificar relacao deployment / produto / cliente; garantir unicidade via constraint no banco; registrar auditoria.
5. Revogacao: executar com conta nao privilegiada real e verificar acesso negado apos revogar, inclusive com sessao preexistente.
6. Backup: restaurar backup completo em ambiente isolado, verificar relacionamentos, RLS, armazenamento e consistencia sem alterar a origem.
7. Mobile: testar fluxos administrativos em desktop, tablet e smartphone; anexar evidencias.
8. Integracao: executar cenarios multiempresa com 7Commander e piloto comercial 7Clinic com contas e dados QA.
9. Comparar migrations versionadas com o Supabase central. Nao executar migrations nem migration repair sem aprovacao.

## Evidencias do validador
Para cada cenario: SHA, usuario/perfil QA (sem segredo), caso de teste, resultado PASS/FAIL/BLOCKED, evidencia e defeito vinculado.

## Estado atual
O codigo de private-storage oferece primitivas server-only para upload e links assinados e exige operador interno autorizado e contrato existente. Nao ha comprovacao de persistencia de metadados nem integracao na UI. Os servicos product-environments estao no backend, ainda sem comprovacao de UI ou auditoria. Nenhum item deve ser marcado PASS apenas por existir helper ou teste nao executado.
