# Design System - 7Service

## Direção

O 7Service deve seguir a identidade dos produtos Consult Services, não reproduzir o layout das referências externas.

## Princípios visuais

- fundo predominantemente branco;
- azul institucional Consult Services como cor primária;
- sem roxo como cor estrutural;
- tipografia limpa;
- cards discretos;
- espaçamento consistente;
- ações nomeadas quando ícone isolado puder gerar ambiguidade;
- status sempre acompanhado de texto, não apenas cor;
- feedback por modal/label/toast consistente, evitando `alert()` do navegador;
- responsivo para desktop e tablet, com tratamento móvel funcional.

## Componentes base

AppShell, Sidebar, Topbar, Breadcrumb, PageHeader, KPI Card, DataTable, Search/FilterBar, StatusBadge, ProductCard, UserCard, ClientCard, Drawer/Modal, ConfirmDialog, FormField, Select, MultiSelect, Timeline, AuditEvent, EmptyState, ErrorState, Skeleton, Pagination e Toast.

## Estados

Todo fluxo deve prever loading, empty, error, success, disabled e permission denied.

## Acessibilidade

Contraste adequado, navegação por teclado, foco visível, labels reais, aria quando necessário e não depender exclusivamente de cor.

## Whitelabel

7Service é interno e usa identidade Consult Services. Whitelabel de clientes pode ser armazenado/administrado quando necessário aos produtos, mas não deve descaracterizar o próprio painel interno.
