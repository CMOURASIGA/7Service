# 7Service | Gate de liberação do licenciamento nominal

Data da revisão: 12/11/2026. Branch: `develop`.
Status: **código preparado, cutover não autorizado, migrations não aplicadas**.

## Diagnóstico read-only da base existente

O projeto Supabase já utilizado pelo 7Service possui 2 contratos,
3 assinaturas, 6 identidades e 6 concessões legadas em estados
ACTIVE/PENDING/SUSPENDED. Não possui ambiente de produto ACTIVE.
As tabelas `contract_seat_pools` e `contract_role_assignments`
ainda não existem na base. Nenhuma alteração foi efetuada pela
consulta diagnóstica.

## Correções adicionadas neste lote

1. A liberação nominal não consulta mais `provisioning_operations.access_id`,
   coluna inexistente no esquema preparado.
2. O processo de reconciliação SHADOW considera concessões legadas,
   atribuições por empresa/produto/instalação e operações remotas
   pendentes. Não libera assento ocupado por atribuição nova.
3. A ativação ENFORCED exige mapeamento dos usuários legados com Auth
   do produto de destino e não permite operações remotas incertas.
4. O teste estático verifica estes invariantes antes de autorizar build.

## Critérios bloqueantes de implantação funcional

- Aplicar as migrações somente após um ensaio transacional em QA
  isolado, com versão do esquema existente compatível e plano
  de rollback comprovado. Nenhuma base nova substitui a existente.
- No projeto PROD, preservar identidades, contratos, assinaturas,
  grants e auditores. Realizar backup e verificar restore em QA.
- Reconciliar assentos por (contrato, identidade) e entitlements
  por produto. Suspensão retém licença. Bloquear mais de um papel
  efetivo no mesmo escopo empresa/produto/instalação.
- Verificar cada ligação de empresa a instalação e o Auth remoto,
  incluindo empresas do mesmo grupo contratual.
- Manter `enforcement_mode='SHADOW'` e todas as flags remotas
  desligadas até os testes PASS. O fluxo legado segue funcionando.
- Validar cenários normais, concorrentes e negados: excesso de
  limite, membro fora do grupo, papel incompatível, instalação
  encerrada, erro remoto, readback divergente, dupla operação,
  revogação e liberação nominal.
- Os RPCs `service_apply_profile_v1` e
  `service_read_profile_v1` devem existir e ser protegidos no
  destino. **O 7Commander só entra na fase final, após liberação
  de manutenção pelo responsável.**
- Não promover `develop` para `main` nem acionar produção
  sem autorização explícita.

## Homologações que podem ocorrer antes da integração com o Commander

- Testes automatizados de TypeScript, lint, Vitest e segurança
  estática das migrações na `develop`.
- SQL no QA isolado: criação do esquema, privilégios de banco,
  restrição de concessões simultâneas, SHADOW, backfill e negações.
- UX das telas sem operações mutáveis conectadas ao Supabase PROD.

## Pendência para encerramento

Sem um QA de banco realmente isolado com esquema compatível, não há
como afirmar PASS das migrações ou end-to-end. Este gate deve
permanecer bloqueado; não tratar um preview Vercel READY como
prova da autorização remota ou do modelo nominal.
