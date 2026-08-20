# Domínio de Produtos

## Objetivo

Permitir que o 7Service administre qualquer produto atual ou futuro da Consult Services sem necessidade de alterar sua estrutura principal.

## Dados

- id;
- code imutável;
- nome;
- descrição;
- status;
- URL de entrada;
- URL de login quando necessária durante transição;
- logo/ícone;
- roles disponíveis;
- módulos;
- features;
- configuração técnica de integração;
- timestamps.

## Perfis por produto

Cada produto define seus próprios perfis. Exemplos ilustrativos:

- 7Commander: Admin, Gestor, Usuário, Visualizador;
- CRM Flow: Admin, Supervisor, Atendente, Visualizador;
- 7Legal: Admin, Advogado, Cliente/Visualizador conforme desenho definitivo.

Os nomes exatos serão cadastrados por produto. O 7Service apenas administra o catálogo e associa um perfil ao acesso do usuário.

## Mudança de perfil

A alteração é realizada na tela de acesso do usuário ou no contexto do produto. O backend deve validar se o role pertence ao produto e registrar auditoria.

## Desativação de produto

Desativar um produto no catálogo não deve apagar assinaturas ou histórico. A ação deve impedir novas concessões e seguir política explícita para acessos existentes.
