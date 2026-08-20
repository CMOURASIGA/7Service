# Autenticação e Identidade Central

## Objetivo

Eliminar progressivamente identidades e credenciais independentes por produto. O usuário deve possuir uma identidade central da Consult Services.

## Regras

- uma pessoa deve possuir um `user_id` central;
- credenciais devem ser administradas pelo provedor de autenticação, inicialmente Supabase Auth;
- tabelas de negócio não armazenam senha;
- convite e recuperação usam tokens temporários e seguros;
- e-mail deve ser normalizado e tratado com unicidade compatível com o provedor;
- MFA deve ser suportável como evolução;
- sessões devem poder ser revogadas em situações críticas.

## Fluxo de convite

1. operador cria/vincula usuário;
2. backend valida cliente, assinatura, licença e permissão do operador;
3. identidade é criada ou reutilizada de forma idempotente;
4. acesso ao produto é criado;
5. convite seguro é gerado;
6. e-mail é enviado;
7. evento é auditado;
8. usuário conclui ativação;
9. estado passa a ACTIVE.

## Recuperação

O 7Service inicia o processo, mas não conhece a senha. O provedor gera fluxo seguro de recuperação. Reenvios devem ser rate-limited e auditados.

## SSO como arquitetura alvo

O 7HUB e os produtos devem evoluir para utilizar a mesma sessão/identidade. Na fase transitória, um card do 7HUB poderá direcionar ao endpoint de entrada do produto, mas a arquitetura não deve pressupor autenticações permanentes separadas.

## Migração

Usuários existentes nos produtos deverão ser reconciliados por estratégia controlada. E-mail pode ajudar no matching, mas o resultado deve ser associado ao `user_id` central. Conflitos e duplicidades devem possuir relatório e resolução administrativa.
