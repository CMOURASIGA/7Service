# Estratégia de Migração para Identidade Central

## Premissa

O 7Service deve estar funcional e estabilizado antes de alterar autenticação dos produtos existentes.

## Ordem inicial aprovada

### Onda 1
- 7Commander
- CRM Flow

Esses dois produtos serão preparados em primeira instância por já possuírem necessidade de gestão de acessos.

### Onda 2
- 7Legal

### Onda 3
- 7Finance
- 7Eventos
- demais produtos

A ordem dentro das ondas pode ser ajustada conforme maturidade técnica, sem alterar a arquitetura alvo.

## Estratégia

1. construir 7Service e identidade central;
2. cadastrar catálogo de produtos e roles;
3. reconciliar usuários atuais por produto;
4. criar associação entre usuários existentes e `central_user_id`;
5. adaptar backend do produto para validar identidade central e acesso efetivo;
6. manter compatibilidade controlada durante transição;
7. validar logs, revogação, expiração e perfis;
8. remover dependência da autenticação local somente depois de homologação.

## Senhas

Senhas existentes não devem ser extraídas, copiadas ou sincronizadas entre bancos. Quando a migração exigir mudança de provedor ou identidade, utilizar fluxo seguro de ativação/reset.

## Requisitos por produto antes do corte

- mapear roles atuais;
- mapear usuários e duplicidades;
- definir `central_user_id`;
- identificar tabelas que referenciam auth.uid diretamente;
- adaptar RLS/APIs;
- validar suspensão por produto;
- validar expiração de assinatura;
- validar auditoria;
- possuir rollback operacional.

## Critério de corte

Um produto só deixa de considerar sua autenticação local como fonte principal quando todos os fluxos críticos estiverem homologados com a identidade central.
