# 7Service - DEV START HERE

## Regra principal

O desenvolvimento do 7Service deve ser orientado pelas especificações deste diretório. O sistema não deve ser tratado apenas como CRUD de usuários. Ele é o control plane administrativo interno da Consult Services para identidade, clientes, produtos, licenciamento, acessos e provisionamento.

## Princípios

1. 7Service é exclusivamente interno à Consult Services.
2. Cliente, produto, assinatura/licença e usuário são domínios distintos.
3. Perfis e permissões são vinculados ao acesso do usuário em cada produto, nunca globalmente.
4. Novos produtos devem ser cadastráveis sem alteração estrutural do 7Service.
5. A identidade deverá evoluir para uma origem central compartilhada pelos produtos.
6. Os sistemas não devem manter regras independentes e conflitantes de licenciamento.
7. Toda alteração crítica deve ser auditável.
8. O frontend nunca será a autoridade para autorização.
9. Segurança, RLS, RBAC e isolamento por cliente são requisitos de arquitetura.
10. O futuro 7HUB consome identidade e direitos de acesso, mas não substitui o 7Service.

## Ordem de leitura

1. `00-product/PRODUCT_SPEC.md`
2. `00-product/PRODUCT_ROADMAP.md`
3. `01-architecture/ARCHITECTURE.md`
4. `01-architecture/DATABASE.md`
5. `01-architecture/AUTHENTICATION.md`
6. `01-architecture/AUTHORIZATION.md`
7. `01-architecture/LICENSING.md`
8. `01-architecture/PROVISIONING.md`
9. `01-architecture/SECURITY.md`
10. `01-architecture/AUDIT.md`
11. `02-design/DESIGN_SYSTEM.md`
12. `02-design/NAVIGATION.md`
13. `03-domains/*`
14. `04-integrations/7HUB.md`
15. `phases/*`

## Stack de referência

- Next.js
- TypeScript
- Tailwind CSS
- Supabase/PostgreSQL
- Supabase Auth como base inicial da identidade central
- Row Level Security
- Edge Functions/APIs para operações privilegiadas
- Vercel
- Serviço transacional de e-mail desacoplado por provider

A implementação final de componentes de infraestrutura deverá respeitar ADRs e as specs de arquitetura.
