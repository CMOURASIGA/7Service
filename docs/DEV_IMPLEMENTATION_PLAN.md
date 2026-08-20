# 7Service - Plano de Implementação

## Objetivo

Este documento define a ordem técnica recomendada para desenvolvimento da Fase 1 do 7Service. O desenvolvimento deve seguir as specs já publicadas no repositório e não deve começar por telas isoladas sem que os domínios, banco e regras de autorização estejam implementados.

## Regra de execução

A sequência abaixo é intencional. Dependências posteriores não devem ser iniciadas antes da estabilização dos blocos anteriores, salvo trabalho claramente paralelo e sem risco de retrabalho.

---

## ETAPA 0 - Preparação do projeto

### Objetivo

Criar a base técnica do repositório e garantir isolamento correto de ambientes.

### Entregas

- Next.js com TypeScript;
- Tailwind CSS;
- estrutura de componentes;
- configuração de lint, formatting e typecheck;
- variáveis de ambiente;
- integração inicial com Supabase;
- ambientes development/preview/production separados;
- estrutura inicial de migrations;
- configuração de logs de aplicação;
- tratamento global de erro;
- base de autenticação interna do 7Service;
- documentação de setup local.

### Estrutura sugerida

```text
src/
  app/
  components/
  features/
  lib/
  services/
  types/
  hooks/
  config/

supabase/
  migrations/
  functions/

public/

docs/
```

### Critério de aceite

Aplicação sobe em development e preview, conecta ao Supabase correto e possui autenticação básica sem secrets expostos no frontend.

---

## ETAPA 1 - Identidade administrativa do 7Service

### Objetivo

Garantir que apenas equipe autorizada da Consult Services consiga administrar o sistema.

### Domínios

- identities internas;
- internal_roles;
- internal_permissions;
- internal_role_permissions;
- internal_user_roles.

### Perfis previstos

- SUPER_ADMIN
- OPERATIONS_ADMIN
- SUPPORT
- COMMERCIAL
- FINANCE
- AUDITOR

Na primeira entrega, SUPER_ADMIN pode ser o único perfil efetivamente liberado, mas o modelo RBAC deve nascer preparado para os demais.

### Telas

- login;
- minha conta;
- administração de usuários internos;
- cadastro de usuário interno;
- definição de perfil interno;
- ativação/bloqueio de usuário interno.

### Regras

- nenhuma permissão privilegiada baseada apenas no frontend;
- service role somente no backend;
- auditoria para criação, alteração de perfil, bloqueio e reativação;
- usuários internos devem ser administrados por uma tela do próprio 7Service.

### Critério de aceite

SUPER_ADMIN consegue cadastrar outro operador interno, definir perfil e bloquear acesso sem acessar Supabase manualmente.

---

## ETAPA 2 - Banco central e fundação de domínio

### Objetivo

Criar o schema central que será fonte de verdade do 7Service.

### Ordem sugerida de migrations

1. enums e tipos básicos;
2. clients;
3. client_contacts;
4. client_addresses;
5. products;
6. product_roles;
7. product_modules;
8. product_features;
9. plans;
10. contracts;
11. contract_files;
12. subscriptions;
13. identities/profile central;
14. user_client binding 1:1;
15. user_product_access;
16. entitlements;
17. invitations;
18. license_usage/controle de consumo;
19. audit_logs;
20. provisioning_jobs;
21. integration_events/outbox.

### Regras obrigatórias

- UUID como identificador principal;
- usuário final vinculado a exatamente um cliente na arquitetura atual;
- e-mail não é chave relacional;
- soft delete/status em domínios administrativos;
- constraints de unicidade;
- foreign keys;
- RLS;
- timestamps em UTC;
- sem cascade destrutivo em auditoria/contratos críticos.

### Critério de aceite

Schema completo versionado por migrations, RLS ativa e testes básicos demonstrando isolamento de tenant e integridade referencial.

---

## ETAPA 3 - Clientes

### Objetivo

Permitir administrar o cadastro completo do cliente.

### Dados mínimos

- tipo de documento: CPF ou CNPJ/CGC;
- documento;
- razão social/nome;
- nome fantasia quando aplicável;
- telefone;
- e-mail;
- contato principal;
- endereço completo;
- status;
- observações;
- datas administrativas.

### Telas

- lista de clientes;
- filtros e busca;
- novo cliente;
- detalhe do cliente;
- edição;
- suspensão/reativação;
- histórico.

### Regras

- não excluir fisicamente cliente;
- validar documento conforme tipo;
- bloquear duplicidade de documento segundo regra aprovada;
- alteração crítica auditada.

### Critério de aceite

Operador consegue criar, editar, suspender, reativar e consultar cliente completo sem acesso direto ao banco.

---

## ETAPA 4 - Catálogo de Produtos

### Objetivo

Tornar o 7Service independente da lista atual de produtos.

### Dados mínimos

- name;
- code imutável;
- descrição;
- status;
- entry_url;
- login_url opcional/transitória;
- logo/ícone;
- roles disponíveis;
- módulos;
- features;
- configurações de integração.

### Produtos iniciais

- 7Commander
- 7Finance
- 7Eventos
- CRM Flow
- 7Legal

### Telas

- catálogo;
- novo produto;
- detalhe do produto;
- roles;
- módulos/features;
- status e URLs.

### Regra essencial

Nenhuma lógica comum deve depender de código específico para os cinco produtos atuais.

### Critério de aceite

Novo produto pode ser cadastrado no catálogo sem necessidade de alteração estrutural do frontend ou banco comum.

---

## ETAPA 5 - Contratos, PDFs e Assinaturas

### Objetivo

Vincular cliente ao produto de forma comercial e operacional.

### Contrato

Dados mínimos:

- número/referência;
- cliente;
- data de início;
- data de fim;
- status;
- observações;
- PDF assinado;
- timestamps.

### Armazenamento de PDF

Utilizar bucket privado no Supabase Storage ou solução equivalente aprovada.

Requisitos:

- acesso somente por usuário autorizado;
- URLs assinadas temporárias;
- metadados do arquivo no banco;
- não tornar contratos públicos;
- manter histórico do documento quando necessário.

### Assinatura por produto

Cada produto contratado deve possuir:

- client_id;
- product_id;
- contract_id;
- plano;
- início;
- fim;
- grace period de 5 dias;
- limite de licenças;
- valor mensal;
- valor de implantação quando aplicável;
- status;
- módulos/features contratados.

### Critério de aceite

Cliente pode possuir vários produtos com contratos/assinaturas independentes e um produto pode ser suspenso sem interferir nos demais.

---

## ETAPA 6 - Licenciamento e Entitlements

### Objetivo

Impedir concessão de acesso incompatível com o contrato.

### Regras

- cálculo de licenças contratadas;
- cálculo de licenças utilizadas;
- cálculo de licenças disponíveis;
- validação backend antes de grant;
- exceção administrativa permitida apenas por perfil autorizado;
- exceção exige motivo;
- exceção gera auditoria;
- suporte a módulos/features.

### Comportamento de limite

Se 20 licenças estão contratadas e 20 em uso, o 21º acesso deve apresentar bloqueio operacional com opção de override apenas para perfil autorizado.

### Critério de aceite

O sistema não permite ultrapassar silenciosamente o limite contratado.

---

## ETAPA 7 - Usuários finais

### Objetivo

Administrar identidades dos clientes.

### Regra de relacionamento

Cada usuário final pertence a um único cliente.

### Dados

- nome;
- sobrenome;
- e-mail;
- telefone opcional;
- cargo opcional;
- cliente;
- status;
- timestamps de convite/ativação quando aplicável.

### Estados

- PENDING_INVITE
- ACTIVE
- SUSPENDED
- BLOCKED
- INVITE_EXPIRED
- REMOVED

### Telas

- lista global;
- busca por nome/e-mail;
- novo usuário;
- detalhe;
- edição;
- acessos por produto;
- timeline;
- auditoria.

### Critério de aceite

Operador localiza qualquer usuário por nome/e-mail e visualiza cliente, produtos, perfis e estado atual.

---

## ETAPA 8 - Gestão de Acessos e Perfis por Produto

### Objetivo

Resolver o principal requisito de autorização do 7Service.

### Modelo

O perfil deve existir no vínculo do usuário com o produto.

```text
user
  + subscription/product
  + product_role
  + status
  + entitlements
```

### Exemplo

```text
João Silva

7Commander
  Perfil: Gestor
  Status: Ativo

CRM Flow
  Perfil: Supervisor
  Status: Ativo

7Legal
  Perfil: Advogado
  Status: Suspenso
```

### Telas

- adicionar produto ao usuário;
- selecionar role;
- módulos/features quando aplicável;
- alterar role;
- suspender acesso somente daquele produto;
- reativar;
- revogar.

### Regras

- alteração de perfil auditada;
- suspensão deve ser por produto;
- suspensão global de identidade permanece ação separada de segurança;
- não remover registro histórico.

### Critério de aceite

Usuário pode possuir perfis distintos por produto e alterações são refletidas e auditadas corretamente.

---

## ETAPA 9 - Convites e Ativação

### Objetivo

Eliminar necessidade de criação manual de credenciais.

### Fluxo

1. cadastrar usuário;
2. selecionar produto(s);
3. definir perfil por produto;
4. validar assinatura/licença;
5. criar identidade central;
6. gerar convite;
7. enviar e-mail Consult Services;
8. usuário abre link;
9. define credencial;
10. identidade ativa.

### Expiração

24 horas.

Após expiração:

- status INVITE_EXPIRED;
- link anterior inválido;
- operador pode reenviar;
- novo token/link é criado.

### Ações administrativas

- reenviar convite;
- copiar link quando seguro e permitido;
- cancelar convite;
- consultar último envio;
- consultar expiração;
- consultar ativação.

### E-mail

Envio pela conta institucional Consult Services, com template próprio.

### Critério de aceite

Usuário consegue receber convite, ativar conta e iniciar acesso sem senha provisória enviada por e-mail.

---

## ETAPA 10 - Recuperação de Acesso

### Objetivo

Permitir suporte sem manipulação de senha.

### Regras

- operador inicia recuperação;
- provedor de autenticação gera token seguro;
- link expira;
- rate limiting;
- auditoria;
- 7Service nunca exibe ou conhece senha atual.

### Critério de aceite

SUPPORT ou perfil autorizado consegue iniciar recuperação sem acesso ao Supabase Auth manualmente.

---

## ETAPA 11 - Vencimento, Carência e Bloqueio por Produto

### Objetivo

Aplicar contrato sem bloquear produtos regulares do mesmo cliente.

### Regra

```text
subscription_end_date
+ 5 dias de grace period
= data de bloqueio efetivo
```

### Exemplo

Contrato termina em 31/08/2026.

- 01/09 a 05/09: GRACE_PERIOD;
- 06/09: BLOCKED.

### Decisão de acesso

O backend deve recalcular/validar o estado efetivo ao autorizar uso. Job agendado pode atualizar estados e gerar alertas, mas não será a única defesa.

### Critério de aceite

7Commander pode ser bloqueado por vencimento enquanto CRM Flow e 7Legal continuam ativos para o mesmo cliente.

---

## ETAPA 12 - Auditoria e Timeline

### Objetivo

Garantir rastreabilidade da operação.

### Eventos mínimos

- cliente criado/alterado/suspenso;
- contrato criado/alterado;
- PDF vinculado;
- assinatura criada/alterada;
- limite alterado;
- override de licença;
- usuário criado;
- convite enviado/reenviado/expirado/aceito;
- acesso concedido;
- perfil alterado;
- acesso suspenso/reativado/revogado;
- identidade bloqueada/reativada;
- recuperação iniciada;
- operação de exportação de dados.

### Telas

- auditoria global;
- timeline do cliente;
- timeline do usuário;
- filtros por período, cliente, produto, operador e ação.

### Critério de aceite

Operador autorizado consegue reconstruir a sequência de mudanças administrativas sem editar ou apagar logs pela interface.

---

## ETAPA 13 - Dashboard e Operação

### Objetivo

Construir o dashboard apenas quando os dados de domínio já forem confiáveis.

### KPIs

- clientes ativos;
- clientes suspensos;
- usuários ativos;
- convites pendentes;
- convites expirados;
- licenças contratadas;
- licenças utilizadas;
- assinaturas em grace period;
- assinaturas bloqueadas;
- distribuição por produto.

### Alertas

- contratos próximos do vencimento;
- assinaturas em grace period;
- limite de licença próximo de 100%;
- falhas de convite;
- falhas de provisionamento quando integração começar.

### Critério de aceite

Indicadores são derivados dos domínios reais, sem números mockados ou cálculos duplicados no frontend.

---

## ETAPA 14 - Exportação e Encerramento de Cliente

### Objetivo

Preparar encerramento administrativo e entrega de dados.

### Fluxo conceitual

1. cliente solicita encerramento/entrega;
2. operador registra solicitação;
3. acessos são revisados e bloqueados conforme processo;
4. sistema gera pacote de exportação;
5. pacote é disponibilizado por período controlado;
6. entrega é registrada;
7. documento/termo final pode ser anexado;
8. cliente permanece preservado em estado ENCERRADO/BLOCKED;
9. política de retenção e LGPD continua aplicável.

### ZIP

O pacote poderá reunir dados exportáveis por domínio em formatos como CSV/JSON e documentos do cliente que possam ser devolvidos.

Não incluir secrets, hashes, tokens, logs internos confidenciais ou dados de outros clientes.

### Critério de aceite

É possível registrar e auditar a entrega dos dados sem apagar fisicamente o histórico administrativo necessário.

---

## ETAPA 15 - Testes da Fase 1

### Unitários

Cobrir pelo menos:

- cálculo de grace period;
- cálculo de licença;
- decisão de entitlement;
- regras de status;
- regras de convite;
- autorização por role.

### Integração

Cobrir:

- RLS;
- criação de cliente;
- contrato + assinatura;
- criação de usuário;
- grant de acesso;
- limite de licença;
- override;
- suspensão por produto;
- convite e ativação;
- auditoria.

### E2E

Cenários prioritários:

1. cadastrar cliente;
2. cadastrar produto/assinatura;
3. cadastrar usuário;
4. conceder 7Commander com perfil Gestor;
5. enviar convite;
6. ativar usuário;
7. alterar perfil;
8. suspender somente 7Commander;
9. manter outro produto ativo;
10. revisar auditoria.

### Segurança

- tenant A não acessa tenant B;
- operador sem permissão não altera contrato;
- usuário final não acessa 7Service;
- frontend não consegue usar service role;
- URL de contrato não é pública;
- token expirado não funciona;
- acesso expirado é negado no backend.

---

## ETAPA 16 - Gate de liberação da Fase 1

A Fase 1 só poderá ser considerada pronta quando todos os itens abaixo estiverem atendidos:

- migrations versionadas;
- RLS validada;
- autenticação interna funcional;
- administração de operadores pela UI;
- clientes funcionais;
- catálogo de produtos funcional;
- contratos e PDFs funcionais;
- subscriptions por produto;
- licenciamento funcional;
- usuários 1:1 com cliente;
- perfis por produto;
- convites de 24h;
- recuperação de acesso;
- bloqueio por produto após grace period de 5 dias;
- auditoria crítica;
- dashboard sem dados fake;
- testes mínimos aprovados;
- documentação atualizada.

Após este gate, inicia-se a Onda 1 de integração com 7Commander e CRM Flow.

---

# Ordem resumida para o desenvolvedor

```text
0. Setup
1. Auth/RBAC interno
2. Banco + RLS
3. Clientes
4. Produtos
5. Contratos + PDFs + Subscriptions
6. Licenciamento + Entitlements
7. Usuários
8. Acessos + Perfis por Produto
9. Convites
10. Recuperação
11. Grace Period + Bloqueio
12. Auditoria
13. Dashboard
14. Exportação/Encerramento
15. Testes
16. Gate da Fase 1
```

## O que NÃO fazer nesta fase

- não desenvolver 7HUB ainda;
- não migrar usuários dos produtos antes da fundação central estar validada;
- não copiar senhas entre Supabases;
- não colocar regras de autorização somente no frontend;
- não criar lógica hardcoded por produto quando o catálogo resolver;
- não apagar clientes, contratos, usuários ou auditoria pelo fluxo normal;
- não iniciar dashboard com dados mockados como se fossem implementação final;
- não integrar simultaneamente todos os produtos.

## Próxima etapa após a Fase 1

Onda 1 de Central Identity e integração:

1. 7Commander;
2. CRM Flow;
3. estabilização do modelo;
4. 7Legal;
5. 7Finance;
6. 7Eventos;
7. futuros produtos;
8. 7HUB e SSO ampliado.
