# Segurança

## Princípios

- deny by default;
- least privilege;
- backend como autoridade;
- isolamento por tenant;
- secrets somente no servidor;
- trilha de auditoria;
- tokens temporários e expiráveis;
- proteção contra enumeração e abuso de convite/reset.

## Supabase

- RLS obrigatória nas tabelas expostas via Data API;
- Service Role somente em backend seguro;
- funções SECURITY DEFINER apenas quando justificadas, com search_path controlado e validações explícitas;
- policies versionadas por migration;
- Storage com buckets e policies adequados para logos/documentos quando utilizados.

## Dados pessoais

Coletar apenas o necessário. CPF não é obrigatório para autenticação. Logs não devem registrar senha, token integral, secret ou payload sensível desnecessário.

## Convites e recuperação

Aplicar expiração, uso único quando possível, rate limiting, auditoria e mensagens que não facilitem enumeração de contas.

## Operações críticas

Suspensão global, alteração de licença, concessão de perfil administrativo e mudanças de segurança devem exigir permissão elevada e auditoria.

## Ambientes e secrets

Development, preview e production devem possuir secrets distintos. Nenhuma chave administrativa deve ser versionada no GitHub.
