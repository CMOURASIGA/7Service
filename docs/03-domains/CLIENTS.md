# Domínio de Clientes

## Objetivo

Representar de forma completa o cliente contratante da Consult Services e servir como raiz para contrato, produtos, licenças e usuários.

## Regra de vínculo

Cada usuário pertence a um único cliente no 7Service. O relacionamento operacional é 1 usuário : 1 cliente.

## Dados obrigatórios do cliente

- tipo de documento: CPF ou CNPJ/CGC;
- número do documento;
- razão social ou nome completo;
- telefone;
- e-mail;
- contato responsável;
- contrato vinculado;
- endereço completo.

## Endereço completo

Deve suportar: CEP, logradouro, número, complemento, bairro, cidade, UF/estado e país.

## Dados adicionais recomendados

- nome fantasia;
- status;
- data de início do relacionamento;
- observações;
- logo;
- contatos adicionais opcionais;
- timestamps de criação e atualização.

## Estados

ACTIVE, SUSPENDED, CLOSED.

Nada é excluído fisicamente pelo fluxo comum do sistema.

## Encerramento

Quando a relação comercial for encerrada, o cliente passa para CLOSED ou status equivalente e seus acessos ficam sujeitos às regras de cada assinatura/produto.

## Portabilidade de dados

Caso o cliente solicite seus dados, o 7Service deve suportar a geração de um pacote único de exportação, preferencialmente ZIP, contendo os dados pertencentes ao cliente conforme escopo definido.

A entrega deve gerar um registro formal contendo data, responsável, escopo entregue e documento/termo de recebimento assinado. Após encerramento, a Consult Services mantém apenas os dados cuja retenção seja necessária por obrigação legal, contratual, segurança, auditoria ou política de retenção aplicável.

## Segurança

Documento, endereço, contatos e demais dados pessoais devem seguir princípio de minimização de acesso. Perfis internos sem necessidade operacional não devem visualizar todos os campos sensíveis.
