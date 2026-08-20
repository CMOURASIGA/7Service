# Fase 01 - Foundation

## Objetivo

Entregar o núcleo operacional do 7Service antes da migração dos produtos para identidade central.

## Escopo funcional

### Administração interna
- login do 7Service;
- cadastro de operadores internos;
- RBAC interno preparado;
- Super Admin inicial;
- tela para criar e administrar acessos internos do 7Service.

### Clientes
- cadastro completo;
- CPF ou CNPJ/CGC;
- razão social/nome;
- telefone;
- e-mail;
- contato;
- endereço completo;
- status;
- contrato vinculado.

### Contratos
- metadados;
- vigência;
- status;
- upload privado de PDF assinado;
- histórico.

### Produtos
- catálogo dinâmico;
- cadastro de URL, logo, roles, módulos e features;
- produtos iniciais: 7Commander, CRM Flow, 7Legal, 7Finance e 7Eventos.

### Assinaturas e licenças
Embora o licensing completo evolua na Fase 2, a Foundation deve registrar por produto: início, fim, limite de licenças, valor mensal, implantação opcional e status.

Deve suportar carência de 5 dias após data final e bloqueio por produto após a carência.

### Usuários
- vínculo obrigatório 1:1 com cliente;
- cadastro de identidade;
- seleção de produtos;
- role específico por produto;
- status de acesso por produto;
- sem exclusão física.

### Convites
- envio institucional Consult Services;
- validade de 24 horas;
- reenvio com novo token;
- ativação;
- recuperação de acesso;
- auditoria.

### Suporte
- busca por usuário/e-mail;
- consulta de cliente, status, produtos e acessos;
- reenviar convite;
- iniciar recuperação;
- alterar role;
- suspender acesso por produto.

### Auditoria
Cobrir eventos críticos desde a primeira versão.

## Gestão de perfil por sistema

A UI deve apresentar a gestão de perfil no contexto do acesso ao produto, e não em um cadastro global de usuário.

Exemplo:

```text
João Silva
Cliente: ACME

Acessos

7Commander
Status: Ativo
Perfil: Gestor [Alterar]

CRM Flow
Status: Ativo
Perfil: Supervisor [Alterar]

7Legal
Status: Suspenso
Perfil: Advogado [Alterar]
```

O select de perfil é carregado do catálogo de roles daquele produto.

## Regras de vencimento

- assinatura termina em `data_fim`;
- carência fixa inicial de 5 dias corridos;
- durante carência, exibir alerta;
- após carência, bloquear/suspender somente aquele produto;
- outros produtos do mesmo cliente continuam ativos se suas assinaturas estiverem válidas;
- renovação pode restaurar os acessos preservados.

## Critérios de aceite

A fase é considerada concluída quando:

1. um operador autorizado cadastra cliente completo;
2. anexa contrato PDF privado;
3. vincula produtos e condições comerciais;
4. cadastra usuário 1:1 com cliente;
5. seleciona um ou mais produtos;
6. atribui perfil diferente por produto;
7. limite de licença é validado no backend;
8. convite de 24h é enviado;
9. usuário consegue ativar conta;
10. suporte consegue reenviar convite/recuperação;
11. acesso pode ser suspenso por produto;
12. expiração + 5 dias bloqueia apenas o produto vencido;
13. operações críticas estão auditadas;
14. nenhum fluxo comum exige alteração direta no banco.

## Não incluído nesta fase

- migração completa de autenticação dos produtos existentes;
- SSO completo;
- 7HUB em produção;
- exportação final de dados completamente automatizada;
- billing/cobrança automática.

Esses itens devem estar previstos na arquitetura, mas não impedem a entrega da Foundation.
