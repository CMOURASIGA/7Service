# UX-7S-01 | Adequação ao 7Components, piloto 7Service

**Data:** 12/11/2026  
**Branch:** `develop`  
**Situação:** homologação funcional de UX aprovada pelo responsável em 12/11/2026, commit `2f719bd`; testes especializados e liberação de produção ainda pendentes.  
**Referências:** [UX-NAV-01](https://github.com/CMOURASIGA/componentes_consult_services/blob/main/propostas/UX-NAV-01-sidebar-adaptativa-tabs.md), [RT-017](https://github.com/CMOURASIGA/componentes_consult_services/blob/main/padroes/RT-017-tabs-navegacao-contextual.md), [UX-ICON-03](https://github.com/CMOURASIGA/componentes_consult_services/blob/main/padroes/UX-ICON-03-acoes-crud-equilibrado.md).

## Escopo realizado

| Área | Antes | Agora em develop | Evidência de código |
| --- | --- | --- | --- |
| Navegação desktop | Sidebar fixa de 256px | Alterna 256px e 72px, reposicionando conteúdo por flex, sem overlay | `src/components/layout/shell-client.tsx`, `sidebar.tsx`, `src/app/globals.css` |
| Preferência visual | Não havia | Salva somente a preferência local do modo compacto, com fallback expandido | `shell-client.tsx` |
| Navegação mobile | Menu drawer | Drawer preservado, Escape/foco inicial e fechamento após navegação | `sidebar.tsx` |
| Abas internas | Ambientes extensa | Quatro abas já implementadas, formulários mantidos durante alternância | `workspace-tabs.tsx`, `ambientes/page.tsx` |
| Botões | Variações de classes Tailwind | Componente comum com tokens de marca e estados semânticos | `src/components/ui/action-button.tsx` |
| Ações por linha | Link de texto heterogêneo | Ações compactas de visualizar/gerenciar com rótulo acessível e alvo touch | `src/components/ui/icon-action-link.tsx` |
| Clientes | Cabeçalho/filtros pouco adaptáveis | Reflow do cabeçalho, filtros, foco e ação de abrir ficha | `clientes/page.tsx` |
| Acessos | Ação Gerenciar por link | Ação de edição por ícone, filtros e botões consistentes | `acessos/page.tsx` |

## Não modificado

- Sem alterações nos bancos, migrações, RLS, autenticação, contratos, licenças ou regras de provisionamento.
- Sem exclusão de rotas e sem alteração na autorização dos endpoints.
- Sem alteração no 7Commander nem no projeto 7Components por dependência técnica: referências de padrões são documentais.
- Sem publicação manual em produção nem aprovação de merge para `main`.

## Homologação funcional aprovada e verificações remanescentes

1. Abrir páginas internas com sidebar expandida e compacta em desktop.
2. Confirmar que a coluna de conteúdo efetivamente cresce (alvos teóricos: sidebar de 256px para 72px; ganho nominal 184px, **ainda não medido visualmente**).
3. Confirmar navegação por mouse, Tab, Enter, Escape no mobile, link ativo e leitura dos ícones no modo compacto.
4. Inspecionar ancoragem da topbar, responsividade em 768px/1024px/1440px, tabelas sem overflow da página.
5. Abrir Ambientes, alternar quatro abas e preservar estado de formulário.
6. Conferir listas Clientes e Acessos, estados vazios, foco e ação por linha.
7. Testar login, logout, usuário sem permissão, abas e rotas diretas. Nenhuma autorização deve depender do menu.
8. Executar lint, typecheck, testes e build em commit consolidado antes da homologação.
9. Registrar capturas e ganhos observados antes de promover padrões a adotados no 7Components.

## Limitações deliberadas

- UX-NAV-01 continua piloto. Não afirmar adoção corporativa sem evidência.
- Ações críticas de banco ou revogação não foram migradas para ícones automaticamente: continuam exigindo confirmação explícita e revisão de contexto.
- A sidebar compacta exibe as rotas existentes como ícones; agrupamentos e favoritos personalizados ficam fora do piloto até validação operacional.
- Falta revisar outras áreas extensas individualmente; não aplicar tabs indiscriminadamente a cada formulário.

## Evidência de aceite do responsável | 12/11/2026

O responsável confirmou a validação dos cinco grupos do checklist funcional para o preview da `develop`, commit `2f719bd613fdea6195d2c1866e33f88b0a00cd45`, sem registrar defeitos: **menu lateral, navegação, Ambientes, botões/ícones e responsividade**.

**Resultado:** UX funcional aprovada para a versão identificada. O aceite não cobre automaticamente alterações posteriores, rotas não percorridas, acessibilidade com leitor de tela, testes formais de segurança, migrações ou provisionamento. Itens 2, 3, 4, 7 e 9 da lista acima permanecem sujeitos às evidências especializadas respectivas, quando não demonstradas pelo checklist simples.

**Próximo gate:** preservar o aceite de UX e executar os testes técnicos antes de qualquer promoção a `main`. 


## Homologação visual recebida e refinamentos finais em 12/11/2026

**Aceite do responsável:** cinco frentes de UX validadas no SHA `2f719bd`, com capturas
da sidebar expandida/compacta, Clientes e Ambientes. O aceite é **visual, com
ressalvas**; não certifica segurança, leitores de tela ou backend.

**Refinamentos registrados em develop após o aceite:**

- O menu mantém `title` e `aria-label` nos ícones compactos, adiciona
  `data-tooltip` descritivo e evita selecionar rotas com prefixo semelhante.
- O cabeçalho apresenta corretamente os nomes de rotas como Ambientes,
  Conexões, Licenças por contrato e Acessos. O selo não afirma mais saúde
  operacional apenas pela presença de configuração do Supabase.
- Na aba Implantações, os três formulários aparecem em colunas no desktop
  amplo, retornando a layout responsivo em telas menores.
- Acessibilidade flutuante: origem do widget ainda não identificada no
  código auditado; não ocultar, remover nem deslocar um recurso assistivo
  sem localizar sua integração e conferir usuários afetados.

**Gates restantes:** lint/typecheck/testes/build do SHA final e inspeção
de desktop/mobile para os refinamentos acima. Sem aceite de produção.

**Pendências funcionais separadas deste UX:** migrações de grupos,
assentos nominais, conexões e atribuições; reconciliação da base legada;
testes de autorização e provisionamento no produto de destino. Preview
e produção usam a mesma base Supabase, portanto não executar DDL em
produção como substituto de testes controlados.
