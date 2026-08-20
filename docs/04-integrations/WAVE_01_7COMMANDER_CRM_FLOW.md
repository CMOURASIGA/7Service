# Onda 1 - Integração 7Commander e CRM Flow

## Objetivo

Migrar os primeiros produtos para identidade e autorização central do 7Service após a fundação estar validada.

## Princípios

- nenhuma senha será copiada entre bases;
- `user_id` central passa a ser referência de identidade;
- cada produto mantém somente dados funcionais específicos;
- acesso deve depender da subscription ativa e do `user_product_access` central;
- migração precisa ser reversível por fase e observável.

## Etapa 1 - Inventário

Para cada produto levantar:
- tabela atual de usuários;
- provedor de autenticação;
- campos de perfil;
- perfis existentes;
- vínculos com empresa/tenant;
- RLS atual;
- referências FK ao usuário;
- convites/reset atuais;
- usuários duplicados ou sem vínculo claro.

## Etapa 2 - Mapeamento

Criar tabela/registro de reconciliação:
- legacy_system;
- legacy_user_id;
- legacy_email;
- central_identity_id;
- match_status;
- migration_status;
- notes.

Estados de match:
AUTO_MATCHED, REVIEW_REQUIRED, CONFLICT, APPROVED.

## Etapa 3 - Perfis

### 7Commander
Cadastrar no catálogo os perfis realmente implementados no sistema. O 7Service não deve inventar role que o produto ainda não saiba interpretar.

### CRM Flow
Mesmo processo, preservando a semântica dos perfis atuais.

Cada integração deve possuir mapa estável:

```text
7Service product_role.code -> product authorization role
```

## Etapa 4 - Autenticação

Arquitetura alvo:
1. login central;
2. emissão de sessão/token;
3. produto valida identidade;
4. produto consulta ou recebe claims mínimas;
5. backend valida acesso e tenant.

Durante transição, pode existir adaptação compatível com Supabase Auth de cada produto, desde que não replique senha e exista plano explícito de retirada.

## Etapa 5 - Banco dos Produtos

Quando tabelas funcionais precisarem referenciar usuário, adicionar `central_user_id` ou migrar referência de forma controlada.

Nunca substituir FK crítica em produção em uma única mudança sem compatibilidade temporária e validação.

## Etapa 6 - Autorização

Antes de liberar acesso, o produto deve validar:
- token válido;
- identidade ativa;
- client_id correspondente;
- produto correto;
- assinatura ACTIVE ou GRACE_PERIOD;
- `user_product_access` ACTIVE;
- role/permission necessária.

## Etapa 7 - Rollout

Sugestão:
1. ambiente development;
2. usuários internos Consult Services;
3. cliente piloto controlado;
4. acompanhamento de login, autorização e auditoria;
5. expansão gradual.

## Etapa 8 - Desativação do legado

Somente após estabilidade:
- impedir criação manual de usuário fora do 7Service;
- remover convites próprios duplicados;
- retirar regras de licenciamento locais conflitantes;
- manter apenas dados de compatibilidade necessários;
- documentar migração concluída.

## Critérios de aceite 7Commander

- usuário provisionado pelo 7Service acessa o produto;
- role definido no 7Service é respeitado;
- usuário suspenso no 7Commander perde somente esse produto;
- assinatura fora da carência bloqueia acesso;
- demais produtos do usuário permanecem inalterados;
- eventos aparecem na auditoria.

## Critérios de aceite CRM Flow

Mesmos critérios acima, respeitando os perfis e regras funcionais específicas do CRM Flow.

## Sequência após Onda 1

Onda 2: 7Legal.

Onda 3: 7Finance e 7Eventos.

Demais produtos seguem o mesmo contrato central.
