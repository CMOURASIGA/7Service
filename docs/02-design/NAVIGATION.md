# Navegação e UX

## Menu principal

- Dashboard
- Clientes
- Usuários
- Produtos
- Licenciamento
- Convites
- Auditoria
- Configurações

Itens devem respeitar autorização do operador.

## Dashboard

KPIs de clientes ativos, usuários ativos, licenças contratadas/utilizadas, convites pendentes e suspensões. Visão por produto e alertas operacionais.

## Cliente

Tabs sugeridas: Visão Geral, Usuários, Produtos Contratados, Licenças, Contratos, Histórico e Auditoria.

Ações principais: adicionar usuário, adicionar produto/assinatura conforme permissão, editar cadastro e suspender/reativar.

## Usuário

Cabeçalho com identidade, cliente(s), status e última atividade disponível. Seções: Acessos, Convites/Segurança, Timeline e Auditoria.

Ações devem permitir conceder acesso, alterar role, suspender por produto, suspender globalmente e iniciar recuperação, conforme autorização.

## Produtos

Catálogo administrável com status, URL de entrada, roles, módulos/features e configuração de integração.

## Busca global

Busca por nome ou e-mail deve localizar rapidamente usuário e contexto de cliente. Busca de cliente deve aceitar nome e documento conforme permissão.

## Confirmações

Ações destrutivas ou de segurança devem informar impacto antes da confirmação. Suspensão deve deixar claro se o escopo é global ou de produto.


## Revisao de navegacao — 28/10/2026
A estrutura alvo de menus e: Dashboard; Clientes; Produtos; Usuarios e Acessos; Ambientes; Licenciamento; Suporte; Auditoria; Administracao. Convites e Contratos permanecem como rotinas contextuais, podendo manter rotas tecnicas ja implementadas.

A **Ficha do Cliente** passa a ser a area operacional principal, com abas Visao geral, Contratos, Produtos, Usuarios, Ambientes e Historico. Acoes sempre condicionadas ao operador autorizado. Referencia normativa: `docs/SPEC_07_ENVIRONMENTS_AND_FRONTEND.md`.
