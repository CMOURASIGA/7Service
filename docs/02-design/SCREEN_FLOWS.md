# 7Service - Telas e Fluxos

## 1. Dashboard

Objetivo: apresentar situação operacional do ecossistema.

Componentes:
- clientes ativos;
- usuários ativos;
- licenças contratadas;
- licenças utilizadas;
- convites pendentes;
- acessos suspensos;
- contratos próximos do fim;
- assinaturas em carência;
- visão por produto.

Ações rápidas:
- cadastrar cliente;
- cadastrar usuário;
- consultar usuário;
- consultar cliente;
- revisar convites pendentes.

## 2. Clientes

Lista com busca por razão social, nome fantasia, CPF/CNPJ, e-mail e contato.

Colunas mínimas:
- cliente;
- documento;
- contato principal;
- produtos ativos;
- usuários ativos;
- status;
- data de início.

Ações:
- visualizar;
- editar;
- bloquear;
- reativar.

Não existe exclusão física pela interface.

## 3. Cadastro de Cliente

Campos:
- tipo de pessoa: física ou jurídica;
- CPF ou CNPJ;
- razão social ou nome completo;
- nome fantasia opcional;
- telefone;
- e-mail;
- contato principal;
- endereço completo;
- observações;
- status inicial;

Endereço:
- CEP;
- logradouro;
- número;
- complemento;
- bairro;
- cidade;
- estado;
- país.

Após salvar, direcionar para detalhe do cliente.

## 4. Detalhe do Cliente

Cabeçalho:
- nome;
- CPF/CNPJ;
- status;
- data de início;
- contato.

Abas:
1. Visão Geral
2. Usuários
3. Produtos
4. Contratos
5. Licenciamento
6. Documentos
7. Histórico
8. Auditoria

Ações:
- adicionar usuário;
- adicionar produto;
- adicionar contrato;
- bloquear cliente;
- exportar dados.

## 5. Contratos

Cada contrato deve permitir:
- número/referência;
- cliente;
- produto vinculado;
- plano;
- início;
- fim;
- 5 dias de carência;
- valor mensal;
- valor de implantação opcional;
- quantidade de licenças;
- módulos/features;
- status;
- observações;
- PDF assinado.

Status sugeridos:
DRAFT, ACTIVE, GRACE_PERIOD, BLOCKED, EXPIRED, CANCELLED.

## 6. Usuários

Lista global com busca por nome, e-mail, cliente e produto.

Colunas:
- nome;
- e-mail;
- cliente;
- produtos ativos;
- status da identidade;
- último acesso quando disponível;
- data de cadastro.

## 7. Cadastro de Usuário

Fluxo:
1. selecionar cliente;
2. informar nome;
3. informar sobrenome;
4. informar e-mail;
5. telefone opcional;
6. cargo opcional;
7. selecionar produtos contratados disponíveis;
8. escolher perfil por produto;
9. validar licenças;
10. criar identidade;
11. enviar convite.

Regra: um usuário pertence a um único cliente.

## 8. Detalhe do Usuário

Cabeçalho:
- nome;
- e-mail;
- cliente;
- status;
- data de criação;
- ativação;
- último acesso quando disponível.

Abas:
1. Acessos
2. Segurança e Convites
3. Timeline
4. Auditoria

## 9. Gestão de Acessos

Cada produto deve aparecer de forma independente.

Exemplo:

```text
7Commander
Status: Ativo
Perfil: Gestor
Licença: Consumindo 1
[Alterar perfil] [Suspender acesso]

CRM Flow
Status: Ativo
Perfil: Supervisor
Licença: Consumindo 1
[Alterar perfil] [Suspender acesso]
```

Nunca utilizar um único perfil global para todos os produtos.

## 10. Perfis por Sistema

Cada produto cadastra seus próprios perfis no catálogo.

Exemplos:
- 7Commander: Admin, Gestor, Usuário, Visualizador;
- CRM Flow: Admin, Supervisor, Atendente;
- 7Legal: Admin, Advogado, Assistente, Cliente Interno.

O 7Service exibe somente perfis válidos para o produto selecionado.

## 11. Convites

Estados:
PENDING, SENT, ACCEPTED, EXPIRED, CANCELLED.

Validade: 24 horas.

Ações:
- reenviar convite;
- gerar novo link;
- copiar link quando permitido;
- cancelar convite.

Após expirar, o link anterior não pode mais ser aceito.

## 12. Recuperação de Acesso

Para usuário ativo:
- enviar recuperação;
- gerar link temporário;
- registrar evento na auditoria.

O 7Service nunca visualiza nem define diretamente a senha atual do usuário.

## 13. Suspensão por Produto

Regra principal: suspensão comercial ocorre por produto.

Exemplo:
- 7Commander bloqueado;
- CRM Flow ativo;
- 7Legal ativo.

O bloqueio de um produto não afeta os demais, salvo suspensão global administrativa da identidade.

## 14. Carência de 5 Dias

Após a data final do contrato/assinatura:
- dias 1 a 5: acesso permitido e assinatura em GRACE_PERIOD;
- a partir do 6º dia: acesso ao produto bloqueado.

A validação deve ocorrer no backend durante a autorização, não apenas em tarefa agendada.

## 15. Administração do 7Service

Tela de administradores internos com:
- nome;
- e-mail;
- perfil interno;
- status;
- data de criação;
- último acesso.

Perfis previstos:
SUPER_ADMIN, OPERATIONS_ADMIN, SUPPORT, COMMERCIAL, FINANCE, AUDITOR.

Inicialmente, apenas SUPER_ADMIN precisa estar operacional, mas RBAC deve nascer preparado.

## 16. Exportação e Encerramento

No detalhe do cliente:
- solicitar exportação;
- gerar pacote ZIP com dados elegíveis;
- registrar data e responsável;
- gerar termo de entrega;
- registrar assinatura/aceite do termo;
- bloquear gestão após encerramento formal quando aplicável.

A exportação não implica remoção automática dos registros que devam ser retidos por obrigação legal, segurança ou auditoria.
