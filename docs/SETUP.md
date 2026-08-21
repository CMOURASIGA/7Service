# Setup local - 7Service

## Pré-requisitos

- Node.js 20+
- npm
- Conta/projeto Supabase (development)
- Supabase CLI (opcional, para rodar migrations localmente)

## Instalação

```bash
npm install
cp .env.example .env.local
```

Preencha `.env.local` com as credenciais do projeto Supabase de **development**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (nunca versionar, nunca expor no client)

## Scripts

```bash
npm run dev          # desenvolvimento local
npm run build         # build de produção
npm run start         # servir build de produção
npm run lint           # eslint
npm run typecheck      # checagem de tipos
npm run format         # prettier --write
npm run format:check   # prettier --check
```

## Migrations

As migrations SQL vivem em `supabase/migrations`. Com a Supabase CLI instalada:

```bash
supabase link --project-ref <ref-do-projeto>
supabase db push
```

O schema de domínio (clientes, produtos, contratos, assinaturas, identidades,
acessos, convites, auditoria etc.) é entregue a partir da Etapa 2 do
`docs/DEV_IMPLEMENTATION_PLAN.md`.

## Ambientes

Development, preview e production usam projetos Supabase e variáveis de
ambiente **isolados** (docs/01-architecture/SECURITY.md). Nenhuma credencial
administrativa deve ser versionada no repositório.

## Estrutura de pastas

```text
src/
  app/          # rotas (App Router)
  components/   # componentes de UI reutilizáveis (design system)
  features/     # funcionalidades de domínio (auth, clients, products, ...)
  lib/          # infraestrutura (supabase, logger, errors)
  services/     # regras de negócio / acesso a dados por domínio
  types/        # tipos compartilhados, incluindo Database gerado
  hooks/        # hooks React compartilhados
  config/       # configuração (env)

supabase/
  migrations/   # schema versionado
  functions/    # Edge Functions

docs/           # especificações do produto (fonte da verdade)
```

## Deploy

O deploy é feito na Vercel a partir da branch de desenvolvimento. Produção
segue a branch `main` somente após validação.
