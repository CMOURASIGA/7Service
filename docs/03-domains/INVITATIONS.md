# Domínio de Convites

## Fluxo

1. operador cadastra usuário;
2. vincula o usuário ao cliente;
3. seleciona um ou mais produtos daquele cliente;
4. define o perfil por produto;
5. backend valida assinatura e licença;
6. identidade é criada;
7. convite é enviado pela conta institucional da Consult Services;
8. usuário define sua senha e ativa a conta.

## Validade

Convite possui validade de 24 horas.

Após expirar, o link anterior não deve continuar válido. O usuário ou operador deve solicitar novo convite, gerando novo token e nova expiração.

## E-mail

O remetente deve utilizar conta institucional da Consult Services. O template deve informar usuário, cliente, produto(s), ação de ativação e prazo de 24 horas.

## Estados

PENDING, SENT, ACCEPTED, EXPIRED, CANCELLED, FAILED.

## Reenvio

Reenvio gera novo evento de auditoria e deve invalidar/substituir o token anterior conforme capacidade do provedor. Aplicar rate limit.

## Segurança

Tokens nunca são senha, devem ser temporários e não devem aparecer integralmente em logs ou auditoria.
