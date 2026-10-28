# 7Service — Gate de homologação `develop` (28/10/2026)

**Candidato:** branch `develop`; identificar SHA final depois dos últimos ajustes.
**Objetivo:** validar o 7Service como painel administrativo central. 7Commander (piloto multiempresa) e 7Clinic (piloto comercial) são *consumidores*, não substituem o escopo do 7Service.
**Estado:** PREPARAÇÃO EM ANDAMENTO — NÃO APROVADO PARA PRODUÇÃO.

## Gates automáticos mínimos
- [ ] SHA único e rastreável, sem commits posteriores à homologação.
- [ ] `npm ci`, formato, lint, typecheck, testes unitários, testes de integração/RLS, build PASS no **mesmo SHA**.
- [ ] `GET /api/health/ready` retorna 200 apenas com Supabase acessível; 503 em falta/erro de configuração e sem segredos no corpo.
- [ ] Ambiente Preview/HML acessível sem proteção adicional indevida da plataforma, mas **admin 7Service exige sessão e RBAC reais**.
- [ ] Variáveis de Supabase segregadas por ambiente, incluindo service role somente no servidor; conferir cotas da Vercel antes de publicar.
- [ ] Migrations reproduzidas integralmente do zero, confrontadas com schema aplicado, sem divergência silenciosa.

## Gate funcional interno — 7Service
- [ ] Bootstrap autorizado do primeiro operador e login real; visitante e cliente final não entram no painel.
- [ ] Dois operadores com perfis distintos: gerência, leitura, recusa e auditoria.
- [ ] Criar/editar/suspender cliente; cadastrar produtos, contratos com PDF privado, assinatura e licença.
- [ ] Convidar usuário por e-mail real; ativar, expirar, recuperar, suspender e revogar acesso.
- [ ] Uma identidade em duas empresas distintas, com perfil por produto e sem vazamento interempresa.
- [ ] Licença sob concorrência e bloqueios por assinatura/ambiente testados em banco.
- [ ] Evidências de GitHub/Vercel só podem ser VERIFIED com consulta real e correspondência de recurso, SHA e ambiente.
- [ ] Backend nunca usa dados mock para leitura ou persistência de produção.
- [ ] Backup e restauração testados em ambiente descartável; não usar banco de clientes para ensaio.

## Piloto 7Commander — ainda não integrado
- [ ] Seleção da mesma identidade em duas empresas com organizações reais mapeadas ao client_id central.
- [ ] Token do provedor central/estratégia de troca comprovada; não reutilizar JWT de outro projeto Supabase.
- [ ] `product.access` e revogação negam por padrão; perfil e tenant continuam protegidos pelo backend do produto.
- [ ] Cenários de isolamento com browser, API, RLS e switch de tenant PASS.
- [ ] Teste E2E Playwright `multitenant-guard.spec.ts` FAIL no run #40767931752; investigar antes do gate.

## Piloto 7Clinic — ainda não integrado
- [ ] Contrato e licenças vinculados ao cliente piloto, com perfis reais do 7Clinic.
- [ ] Identidade e ambiente autorizados sem expor dados de pacientes no 7Service.
- [ ] Demonstração estável separada do `develop` e do `main`; sem login Vercel para demo autorizada.
- [ ] Teste de suspensão de acesso sem afetar os demais produtos e sem alterar fluxos clínicos.
- [ ] Respeitar os cenários de Human Validation conhecidos e seus adiamentos, sem convertê-los em PASS.

## Decisão de publicação
1. Lote com ao menos seis entregas concluídas/testadas, gates completos e recursos Vercel disponíveis.
2. Preparar `develop` para homologação; solicitar autorização de deploy antes de publicar.
3. Validar operações humanas e registrar evidências por ambiente/SHA.
4. `main`/produção somente mediante autorização **separada e explícita**.

**Não afirmar:** que SPECs 01–07 estão homologadas, que banco dedicado foi provisionado ou que os dois pilotos estão integrados, enquanto itens acima permanecerem em aberto.
