# 7Service — SPEC 07: Ambientes dedicados, links e operação do frontend
Data: 2026-10-28
Status: DECISOES DE PRODUTO APROVADAS PARA ESPECIFICACAO; IMPLEMENTACAO, DESENHO TECNICO E HOMOLOGACAO PENDENTES
Depende de: SPEC 00 e SPECs 01–06.

## 1. Decisao de arquitetura
- Na primeira etapa, CADA CLIENTE possui banco de dados operacional dedicado, isolado dos demais clientes e do banco administrativo do 7Service.
- A arquitetura registra a modalidade da implantacao, de modo a permitir modelo compartilhado posteriormente SEM afirmar que ele ja esta implementado.
- Banco dedicado NAO significa que cada cliente tera necessariamente codigo-fonte ou deploy frontend exclusivos. Deployment, banco, URL, cliente e ambiente sao recursos distintos.
- Ambientes de PRODUCAO, HOMOLOGACAO e DESENVOLVIMENTO possuem autorizacoes explicitas; dados de homologacao/desenvolvimento nao podem alterar dados de producao. DEMONSTRACAO e um ambiente estavel separado, quando aplicavel.
- Um cliente como Renata pode ter acesso ao 7Clinic PRODUCAO e HOMOLOGACAO, mas nao ao 7Commander ou ao desenvolvimento. Um operador Consult autorizado pode ter acesso de suporte delimitado aos ambientes da empresa, com auditoria.
- 7Service permanece privado aos operadores internos. Os clientes acessam SOMENTE seus produtos e ambientes autorizados, nao o painel 7Service.

## 2. Gestao de recursos e links
Os registros administrativos devem associar cliente, produto, deployment, ambiente, URL validada, banco dedicado (referencia/identificador NAO secreto), versao/commit, status operacional, datas, responsaveis e integracao; a URL nao concede acesso por si so.
Propostas de entidades a confirmar contra migrations existentes: product_deployments, product_environments, client_deployments, environment_access, deployment_versions, infrastructure_resources e client_feature_flags. Preferir audit_logs existente em vez de criar auditoria duplicada.
Nunca armazenar senhas, chaves service-role ou connection strings sensiveis nas tabelas de consulta do painel. O provisionamento real requer integracao segura com provedores e comprovacao de conclusao; registrar "solicitado" nao significa "provisionado".

## 3. Navegacao principal do frontend
Nove grupos de trabalho, com permissoes de operador:
1. Dashboard: indicadores reais, vencimentos, pendencias, falhas e ambientes.
2. Clientes: cadastro, ficha consolidada, contratos, produtos, usuarios, ambientes e historico.
3. Produtos: catalogo, roles, modulos, features globais e exclusivas.
4. Usuarios e acessos: identidade unica, memberships por empresa, perfil por produto e ambiente, convites, recuperacao, suspensoes.
5. Ambientes: deployment, banco dedicado, URLs, producao, HML, desenvolvimento, demonstracao, versao e estado.
6. Licenciamento: planos, assinaturas, limites, vigencia, excedentes com justificativa.
7. Suporte: busca por empresa/produto/ambiente, diagnostico, incidentes e acesso de suporte limitado, consentimento conforme requisito, motivo e auditoria.
8. Auditoria: trilha por ator, empresa, produto, ambiente, data e correlation_id.
9. Administracao: operadores internos autorizados, perfis, configuracao de integracoes e futuramente controles de IA.
Convites continuam como rotina de Usuarios e Acessos, podendo manter rota propria. Contratos sao acessados preferencialmente pela ficha de Cliente. Nao recriar telas que ja existem sem avaliacao de reaproveitamento.

## 4. Ficha do cliente como centro operacional
Cabecalho: nome, documento, status, responsaveis e acoes autorizadas.
Abas: Visao geral, Contratos, Produtos, Usuarios, Ambientes, Historico.
Da aba Ambientes: localizar producao/HML/desenvolvimento/demonstracao e distinguir URL, banco e deploy; status informativo e acesso condicionado a permissao. Nunca oferecer console direto do banco de producao como rotina ordinaria.
Da aba Produtos: contratos, assinatura, licencas, features globais e exclusivas.
Da aba Usuarios: identidade existente ou nova, vinculo empresa, produto, perfil, autorizacao por ambiente e eventos.
Dados reais; exibir estados loading, empty, error, forbidden e success e mensagens acionaveis.

## 5. Fluxo administrativo de onboarding
1. Cadastrar cliente e responsaveis.
2. Associar contrato, produto, plano e limite de licencas.
3. Solicitar/provisionar banco dedicado e ambientes; aguardar retorno verificavel.
4. Cadastrar e verificar URLs/versoes, sem confundir endereco com autorizacao.
5. Cadastrar/vincular identidades, inclusive multiempresa.
6. Conceder acessos por cliente, produto e ambiente, respeitando licencas e RBAC.
7. Executar testes de login, isolamento, restricoes, persistencia e auditoria.
8. Registrar homologacao e aprovacao explicita de publicacao antes de liberar producao.

## 6. Funcionalidades globais e exclusivas
- GLOBAL: implementada no produto-base, disponibilizada a clientes segundo versao/plano.
- EXCLUSIVA CONFIGURAVEL: desenvolvida no codigo-base ou modulo isolado e habilitada somente para client_id autorizado via feature flag/entitlement VERIFICADO NO BACKEND.
- DEDICADA: implantacao ou modulo isolado quando incompatibilidade, risco, contrato ou integracao especifica justificar, preservando interface/contrato e ciclo de atualizacao.
- Banco dedicado nao implica codigo dedicado, e funcionalidade exclusiva nao implica banco dedicado.
- Alteracoes globais nao devem expor ou habilitar features exclusivas para outras empresas.

## 7. Seguranca e suporte
- Acesso por identidade + cliente + produto + ambiente + permissao; validacao na API e no banco.
- RLS/escopos mesmo quando banco e dedicado, privilegio minimo e isolamento entre ambientes.
- Acesso temporario de suporte: autor, motivo, escopo, validade, logs e eventual aprovacao, sem personificar cliente ou reutilizar senha.
- Backups/restauracao por cliente e por ambiente, exercicios de restauracao, documentacao de responsavel e alertas.
- Observabilidade: erros, deployment, identificacao de tenant/ambiente e correlation_id, sem registrar dados sensiveis desnecessarios.
- Revogacoes devem propagar dentro de prazo definido e testado.

## 8. Criterios de aceite
- Cliente A nao acessa dados, links restritos ou APIs de B.
- Renata acessa 7Clinic PROD e HML autorizados, nao DEV nem 7Commander; Christian apenas acessos de suporte explicitamente concedidos.
- Ao alternar empresa ou ambiente nao ha vazamento de estado/cache/sessao.
- HML nunca escreve em banco PROD; banco PROD de cada cliente e distinto.
- URL acessivel nao contorna autorizacao.
- Uma feature exclusiva de Renata nao aparece/funciona no backend de outro cliente.
- Fluxo completo de onboarding sem SQL manual, com provisionamento comprovado.
- Operacoes criticas auditadas, backup/restauracao ensaiados, testes de seguranca e gates tecnicos PASS.
- Painel 7Service negado a usuarios finais de clientes.

## 9. Nao autorizados neste documento
Criar recursos de producao, alterar Supabase real, provisionar banco, publicar Vercel, fundir main, migrar clientes existentes, criar novas branches ou implementar agente de IA. Esta SPEC registra o objetivo e os criterios, nao certifica entregas.
