# 7Service | Provisionamento centralizado | 2026-11-08

## Decisões aprovadas
- O produto chama-se **7Service** e é o único painel administrativo de usuários, empresas, produtos, contratos, perfis e concessões.
- **Nenhum banco Supabase novo** será criado. Reutilizar exclusivamente os projetos existentes, sem tocar nos dados de produção neste desenvolvimento.
- O mesmo produto pode ter instalações compartilhadas ou dedicadas. Uma instalação dedicada pode atender várias empresas do mesmo grupo.
- A unidade de autenticação técnica é o Supabase Auth de cada instalação. Uma identidade central pode corresponder a contas Auth locais distintas, sem compartilhar senhas.
- Uma licença nominal é consumida uma única vez por identidade e **contrato**, mesmo que o usuário acesse produtos, empresas e instalações distintos dentro do escopo comercial contratado.
- A mesma identidade pode ter perfis diferentes em empresas diferentes; não pode manter dois perfis efetivos simultâneos para a mesma empresa + produto + instalação.
- As permissões são concedidas explicitamente. A licença não concede acesso automático a produtos ou empresas.
- O cadastro administrativo de usuários nos sistemas finais será desabilitado na fase de adaptação dos produtos.

## Estado do repositório antes da evolução
- Clientes, produtos, contratos, assinaturas por produto, identidades, memberships, grants, ambientes e auditoria existem.
- A rotina atual usa `subscriptions.license_limit` por produto e a RPC `grant_product_access_atomic`. Não mudar suas regras antes de migrar as restrições do banco e testar o efeito nos usuários existentes.
- A tela Ambientes hoje registra metadados, não credenciais nem conexões operacionais.
- Há consulta de autorização no 7Service e integração específica com o 7Commander. Isso não equivale ao provisionamento genérico em outros Auths.

## Ordem de execução

### Pacote A: somente 7Service
1. Núcleo de regras de licença nominal por contrato e testes. **Iniciado** em `src/lib/licensing/named-seats.ts`.
2. Inventário do esquema existente e migration aditiva de contrato/grupo/empresa operacional; preservar registros atuais.
3. Mapeamento entre cliente contratante, empresa operacional, instalação e ambiente; impedir vínculos entre clientes incompatíveis.
4. Cofre de credenciais no servidor, sem retorno ao navegador; conexão em modo teste com prevenção de SSRF e validação do projeto Supabase esperado.
5. Interface para testar conexão e registrar estado técnico. Não persistir segredos em colunas textuais sem criptografia.

### Pacote B: somente 7Service
1. Motor idempotente de provisionamento com autorização administrativa e trilha de auditoria.
2. Identidade central ↔ UID Auth local por instalação; impedir associação somente por coincidência de e-mail.
3. Vincular empresas operacionais e perfis via contrato versionado de adaptador.
4. Convites, recuperação e suspensão no Auth correto; revogação e desprovisionamento de papéis sem apagar a identidade.
5. Reconciliação de estados remoto/local e filas de falha seguras.
6. Contagem nominal de licenças em transação no banco, sob concorrência. **Não** usar somente o helper TypeScript como barreira final de limite.

### Pacote C: 7Commander por último
1. Congelar integração no ponto acordado com o outro desenvolvedor; reavaliar o commit e as rotas atuais no início do pacote.
2. Desabilitar administração independente de usuários/perfis.
3. Implementar o contrato de provisionamento no backend do 7Commander e confirmar isolamento via RLS.
4. E2E: criação somente pelo 7Service, acesso a múltiplas empresas, perfis diferentes, limite de contrato e revogação mesmo com sessão aberta.
5. Testes de regressão, readiness, homologação na develop e só então pedido de autorização para produção.

## Política de entrega
- Somente branch `develop` no 7Service; não alterar main ou produção.
- Não alterar o repositório nem o banco do 7Commander antes de sua etapa explicitamente coordenada.
- Nunca armazenar `service_role` em navegador, `NEXT_PUBLIC_*`, logs ou arquivos Git.
- Todo processo de autorização deve negar acesso em caso de falha, com auditoria.
- Testes, lint, typecheck e build precisam passar antes de qualquer conclusão de pacote.

## Critério de aceite de ponta a ponta
Configurar instalação existente, registrar contrato e empresas, convidar um usuário, provisionar seu Auth correto e o perfil local, contar uma licença apesar de múltiplos produtos/empresas, impedir duplicidade de perfil, negar excesso de licenças, revogar acesso por empresa/produto, demonstrar bloqueio via API, e registrar evidências e auditoria.
