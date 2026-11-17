# INT-02 | Propagação de revogações 7Service → Commander

## Escopo implementado em develop

- Suspensão ou revogação de vínculo empresarial no 7Service dispara uma intenção de suspensão da **mesma identidade e empresa** no Commander.
- Suspensão ou revogação de concessão do produto COMMANDER7 dispara a mesma intenção **somente se não houver outra concessão ACTIVE para o mesmo produto e empresa**.
- A decisão central de autorização no 7Service já bloqueia imediatamente o vínculo ou concessão revogados. A sincronização local é adicional, não substitui a decisão central.
- O 7Service usa uma requisição HTTPS assinada por HMAC-SHA256 com timestamp e identificadores centrais. Não envia e-mail, senha, UID do Auth remoto ou service_role.
- O endpoint do Commander exige assinatura válida, timestamp recente e mapeamentos explícitos ACTIVE da identidade e empresa para seus IDs locais. Atualiza somente o vínculo local correspondente para `suspended`, com registro de auditoria e leitura posterior.
- Falha de comunicação ou ausência de configuração **não é reportada como sucesso da revogação remota**. O status central já alterado permanece revogado, e o operador recebe uma mensagem de reconciliação pendente.
- O processo é de **negação de acesso apenas**. Não concede nem reativa permissões. Reativação e provisionamento de novos usuários permanecem no Marco 2.

## Configuração protegida (NÃO CONFIGURADA POR ESTE COMMIT)

No Vercel **7Service**:
- `SERVICE_COMMANDER_REVOCATION_URL`: URL HTTPS absoluta para `/api/integrations/7service/revocation` do deploy Commander validado.
- `SERVICE_COMMANDER_REVOCATION_SECRET`: segredo aleatório de pelo menos 32 caracteres.

No Vercel **7Commander**:
- `SERVICE_7SERVICE_REVOCATION_SECRET`: o **mesmo** segredo aleatório protegido.

Usar variáveis secretas de servidor; nunca `NEXT_PUBLIC_`, logs, artefatos nem Git. A URL deve ser um deploy validado do Commander, com rota acessível exclusivamente ao remetente autorizado, respeitando Deployment Protection. Secrets de produção só podem ser ativados após E2E aprovado e autorização de release.

## Aceite pendente antes de produção

1. Validar assinatura inválida/ausente, payload adulterado, evento antigo, mapeamento de identidade ou empresa inexistente: todos negados.
2. Revogar apenas Consult Services, preservar 7Consulting do mesmo usuário.
3. Revogar COMMANDER7 somente após última concessão ativa daquele produto/empresa.
4. Confirmar registro local de `suspended` e auditoria no Commander, e acesso API negado com sessão previamente aberta.
5. Testar falha/timeout do destino: o 7Service informa **pendente de confirmação**; não volta a autorizar o acesso central.
6. Comprovar autorização central e RLS/PostgREST impedindo leitura/gravação no destino.
7. Homologar o botão de sincronização manual disponível nos detalhes do usuário quando o vínculo ou concessão está suspenso/revogado. O servidor verifica novamente o estado central antes de suspender o vínculo local. Fila automática de retries e reativação fazem parte de trabalho posterior, **não estão implementadas**.

**Estado:** implementação de código em develop, sem secrets ou sincronização remota real habilitados, sem mudanças na main ou bancos.
