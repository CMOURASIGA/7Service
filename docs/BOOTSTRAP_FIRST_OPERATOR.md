# 7Service — primeiro operador interno

A implantação inicial começa sem operadores internos. Somente o responsável pela infraestrutura executa o bootstrap uma única vez, fora do navegador e do CI.

1. Em estação administrativa confiável configure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e BOOTSTRAP_ADMIN_EMAIL. Nunca registre a service-role em commit, ticket ou chat.
2. Verifique que a URL corresponde ao Supabase administrativo do 7Service, não ao banco operacional de um cliente.
3. Execute node scripts/bootstrap-first-operator.mjs com dependências instaladas. Não ocorre deploy.
4. O script bloqueia repetição se já existir operador. Solicita convite Auth, cria vínculo interno, atribui SUPER_ADMIN, audita e ativa após essas etapas.
5. Complete o convite Auth no e-mail, valide login e RBAC. Entrega e expiração do e-mail exigem teste real.
6. Novos operadores devem ser geridos pela interface autenticada; não reutilize o bootstrap.

Se o convite tiver sido enviado e qualquer etapa posterior falhar, interrompa. O processo deve reconciliar com segurança a conta Auth, vínculo, perfil, auditoria e status antes de retentar. Não elimine contas automaticamente.

Esta documentação não autoriza criação de operador real, alteração de produção ou publicação.
