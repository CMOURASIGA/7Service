# UX-NAV-01 | Handoff de desenvolvimento: Sidebar adaptativa + navegação contextual

**Data:** 12/11/2026
**Destino:** 7Service / `develop` para desenvolvimento e homologação. **Não publicar em `main` sem autorização.**
**Status:** SPEC APROVADA PARA ENCAMINHAMENTO AO DEV, **SEM IMPLEMENTAÇÃO NESTA ENTREGA**.
**Padrão candidato:** [7Components UX-NAV-01](https://github.com/CMOURASIGA/componentes_consult_services/blob/main/propostas/UX-NAV-01-sidebar-adaptativa-tabs.md).
**Padrão existente de abas:** [RT-017](https://github.com/CMOURASIGA/componentes_consult_services/blob/main/padroes/RT-017-tabs-navegacao-contextual.md).

## Objetivo
Unificar sidebar compacto/expandido e tabs contextuais no 7Service, aumentando o espaço útil de tabelas, cadastros e ambientes sem sobreposição de conteúdo no desktop. Navegação global permanece no sidebar; tabs organizam áreas da entidade/tela. Não copiar estilo visual da referência externa; seguir design system do produto.

## Inventário confirmado em develop
- `src/components/layout/sidebar.tsx`: menu atual por seções, ativo por pathname, logo, itens próprios do 7Service, drawer mobile.
- `src/components/layout/app-shell.tsx`: wrapper do `ShellClient`.
- `src/components/layout/shell-client.tsx`: localizar estado/layout para toggle, reflow e mobile.
- `src/components/ui/workspace-tabs.tsx`: tabs acessíveis (tablist/tab/tabpanel, setas, Home/End), preservação de formulário com painéis montados, faixa com scroll horizontal.
- `src/app/(admin)/ambientes/page.tsx`: quatro abas reais, Implantações, Ambientes registrados, Versões e evidências, Conexões Supabase.
- `docs/02-design/NAVIGATION.md` e `docs/02-design/DESIGN_SYSTEM.md`: contratos atuais.
- Rotas, permissões, 7Service central, RBAC e auditoria ficam **inalterados**.

## Ordem técnica recomendada
### P1. Sidebar adaptativa
1. Revisar `ShellClient` e CSS do shell. Criar estado compacto/expandido com preferência por usuário somente visual. Cuidado com SSR, hydration, reduced-motion.
2. Faixas de largura de referência: compacto 64–72 px, expandido 240–260 px, sem CSS fixo por pixel obrigatório. Desktop: largura do conteúdo recalculada, sem overlay. Mobile: drawer permanece overlay, com backdrop, Escape e foco gerenciado.
3. Compacto: logo de identidade visível, ícones das rotinas principais, tooltip/título acessível, aba ativa, botão expandir. Expandido: exibir nome do produto, rótulos, grupos e rotinas secundárias, controles do usuário. Evitar excesso de ícones em coluna.
4. Manter URLs e nomes atuais. Não usar `localStorage` para determinar acesso, somente preferência de UI. Condicionar navegação a permissões existentes no produto sem fazer do cliente a fonte da autorização.

### P2. Abas contextuais
1. Reutilizar `WorkspaceTabs` e RT-017. Evitar criar `TabsV2` paralelo sem lacuna comprovada.
2. Manter as quatro abas de Ambientes e sua persistência de formulário.
3. Avaliar Ficha do Cliente para abas: visão geral, contratos, produtos, usuários, ambientes, histórico, conforme rotas/funcionalidades realmente disponíveis. Não criar telas fictícias. Itens que exigem rota profunda devem continuar Link.
4. Uma única camada de abas por contexto. Para tabs roteáveis, sincronizar `tab` na URL e validar back/forward/refresh; para seções de formulário, estado local pode ser apropriado.
5. Testar tab ativo/foco, rolagem horizontal apenas na faixa, ARIA e comportamento com sidebar recolhido e expandido.

### P3. Reflow e homologação
- Dashboard, listagens de Clientes/Usuários, Produtos, Ambientes, Acessos, Licenciamento, Auditoria: sem esconder colunas, filtros, botões ou mensagens.
- Tabelas podem rolar localmente quando necessário, sem overflow da página causado pelo menu.
- Preservar formulários editados em mudança de tab; alertas e erros não podem ficar escondidos indevidamente.
- Verificar desktop 1366 e 1440, tablet e mobile, navegação por teclado, screen reader e reduced-motion.
- Verificar usuário administrativo e perfil sem permissão; tentativas API diretas permanecem bloqueadas.
- Documentar largura do conteúdo antes/depois, mudanças de tempo/cliques nas rotinas principais e evidência visual. Não alegar ganho sem medir.

## Critérios de aceite
- [ ] Toggle compacto/expandido acionável via botão e teclado, com logo no topo.
- [ ] Ícones de rotinas principais funcionais, tooltip e item ativo corretos.
- [ ] Reflow real desktop sem sidebar cobrir a tela ou ocultar ações.
- [ ] Drawer móvel preservado, Escape, foco e fechamento ao navegar.
- [ ] Preferência visual preservada em recarga sem vazamento entre usuários.
- [ ] Ambientes mantém as quatro abas existentes e valores dos formulários.
- [ ] Ficha do Cliente com tabs somente onde há conteúdo real autorizado.
- [ ] Abas acessíveis, navegação por teclado, URL quando aplicável.
- [ ] Sem regressões de login, RBAC, 7Service/7Commander, auditoria e rotas.
- [ ] Testes, typecheck, lint e build PASS, evidências no PR.
- [ ] Homologação de ganho e adoção no 7Components **ainda separadas**.

## Restrições
Não alterar migrations, banco, RLS, autenticação, regras de provisionamento e ciclo de vida dos ambientes. Sem merge em `main`. Separar design de regras de negócio; construir em branch de trabalho derivada da `develop` e enviar PR para `develop`.
