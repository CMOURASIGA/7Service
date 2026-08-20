# 7HUB - Integração com 7Service

## Definição

7HUB será o portal de entrada do usuário para o ecossistema Consult Services. É uma aplicação separada do 7Service.

7Service é administrativo e interno. 7HUB é orientado ao usuário final.

## Experiência inicial

Após autenticação, o usuário vê somente produtos com acesso efetivo ativo. Cada produto aparece em um card contendo, quando disponível:

- ícone/logo;
- nome;
- descrição curta;
- cliente/contexto quando necessário;
- status relevante;
- botão `Acessar`.

Produtos não contratados ou não autorizados não devem aparecer como se estivessem disponíveis.

## Entrada no produto

A primeira integração pode usar a `entry_url` cadastrada no catálogo. Entretanto, o objetivo arquitetural é SSO. Portanto, o 7HUB não deve ser desenhado em torno da premissa definitiva de que o usuário precisará digitar senha novamente em cada sistema.

## Fonte dos cards

Os cards não serão hardcoded. Devem resultar da consulta aos acessos/entitlements efetivos do usuário e ao catálogo de produtos do 7Service/Identity.

## Possíveis evoluções

- SSO completo;
- troca de contexto quando usuário pertence a mais de um cliente;
- favoritos/ordenação;
- notificações agregadas;
- status dos produtos;
- atalhos contextuais;
- perfil e segurança da conta;
- assistência de IA transversal, somente após definição específica de segurança e escopo.

## Segurança

Ocultar um card não revoga acesso. Cada produto continua obrigado a validar autorização no backend.
