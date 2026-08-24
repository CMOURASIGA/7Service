import type { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectAs, resetTestDatabase } from './setup';

/**
 * Testes de RLS/multi-tenant/IDOR rodando contra um Postgres real com as
 * migrations de produção aplicadas (não contra o mock em memória).
 *
 * Cobre a lista de cenários levantada na revisão da Fase 1
 * (isolamento entre tenants, IDOR por manipulação de UUID, privilégio
 * mínimo por permission, bypass de service_role, anon sem acesso).
 *
 * Fora do escopo aqui (dependem do Supabase real - ver docs/TESTING.md):
 * Storage/PDF, GoTrue/PostgREST, limite de licença sob concorrência real.
 */

const CLIENT_A = 'a0000000-0000-0000-0000-00000000000a';
const IDENTITY_A_SUB = 'a1000000-0000-0000-0000-000000000001';
const IDENTITY_B_SUB = 'b1000000-0000-0000-0000-000000000001';
const SUPER_ADMIN_SUB = '10000000-0000-0000-0000-000000000001';
const SUPPORT_SUB = '10000000-0000-0000-0000-000000000002';
const BLOCKED_OPERATOR_SUB = '10000000-0000-0000-0000-000000000003';
const SUBSCRIPTION_B = 'db000000-0000-0000-0000-000000000001';
const CONTRACT_B = 'cb000000-0000-0000-0000-000000000001';
const ACCESS_B = 'fb000000-0000-0000-0000-000000000001';

async function close(...clients: Client[]) {
  await Promise.all(clients.map((c) => c.end()));
}

beforeAll(async () => {
  await resetTestDatabase();
}, 60_000);

describe('isolamento entre tenants (Cliente A não acessa dados do Cliente B)', () => {
  it('identidade do Cliente A não lê assinatura do Cliente B', async () => {
    const asA = await connectAs('authenticated', IDENTITY_A_SUB);
    const result = await asA.query('select * from public.subscriptions where id = $1', [
      SUBSCRIPTION_B,
    ]);
    expect(result.rowCount).toBe(0);
    await close(asA);
  });

  it('identidade do Cliente A não consegue alterar assinatura do Cliente B (IDOR)', async () => {
    const asA = await connectAs('authenticated', IDENTITY_A_SUB);
    const update = await asA.query(
      'update public.subscriptions set license_limit = 999 where id = $1',
      [SUBSCRIPTION_B],
    );
    expect(update.rowCount).toBe(0);
    await close(asA);

    // Confirma, com service_role, que o valor realmente não mudou.
    const asService = await connectAs('service_role');
    const check = await asService.query(
      'select license_limit from public.subscriptions where id = $1',
      [SUBSCRIPTION_B],
    );
    expect(check.rows[0].license_limit).not.toBe(999);
    await close(asService);
  });

  it('identidade do Cliente A não lê user_product_access do Cliente B mesmo sabendo o ID (IDOR)', async () => {
    const asA = await connectAs('authenticated', IDENTITY_A_SUB);
    const result = await asA.query('select * from public.user_product_access where id = $1', [
      ACCESS_B,
    ]);
    expect(result.rowCount).toBe(0);
    await close(asA);
  });

  it('identidade do Cliente A não consegue escrever em contrato do Cliente B (IDOR de escrita)', async () => {
    const asA = await connectAs('authenticated', IDENTITY_A_SUB);
    const update = await asA.query('update public.contracts set status = $1 where id = $2', [
      'CANCELLED',
      CONTRACT_B,
    ]);
    // Identidades de cliente nunca têm contracts_write (exige permission
    // interna) — o resultado deve ser 0 linhas independente do tenant.
    expect(update.rowCount).toBe(0);
    await close(asA);
  });

  it('identidade do Cliente B lê a própria assinatura normalmente (controle positivo)', async () => {
    const asB = await connectAs('authenticated', IDENTITY_B_SUB);
    const result = await asB.query('select id from public.subscriptions where id = $1', [
      SUBSCRIPTION_B,
    ]);
    expect(result.rowCount).toBe(1);
    await close(asB);
  });
});

describe('privilégio mínimo entre operadores internos', () => {
  it('SUPER_ADMIN lê e escreve clientes normalmente (controle positivo)', async () => {
    const asAdmin = await connectAs('authenticated', SUPER_ADMIN_SUB);
    const select = await asAdmin.query('select id from public.clients where id = $1', [CLIENT_A]);
    expect(select.rowCount).toBe(1);

    const update = await asAdmin.query('update public.clients set notes = $1 where id = $2', [
      'ok',
      CLIENT_A,
    ]);
    expect(update.rowCount).toBe(1);
    await close(asAdmin);
  });

  it('SUPPORT lê clientes mas não pode alterar (sem clients.manage)', async () => {
    const asSupport = await connectAs('authenticated', SUPPORT_SUB);
    const select = await asSupport.query('select id from public.clients where id = $1', [CLIENT_A]);
    expect(select.rowCount).toBe(1);

    const update = await asSupport.query('update public.clients set notes = $1 where id = $2', [
      'tentativa indevida',
      CLIENT_A,
    ]);
    expect(update.rowCount).toBe(0);
    await close(asSupport);
  });

  it('operador interno BLOCKED perde toda a autorização (is_internal_operator = false)', async () => {
    const asBlocked = await connectAs('authenticated', BLOCKED_OPERATOR_SUB);
    const select = await asBlocked.query('select id from public.clients where id = $1', [CLIENT_A]);
    expect(select.rowCount).toBe(0);
    await close(asBlocked);
  });
});

describe('service_role e anon', () => {
  it('service_role ignora RLS (bypass administrativo esperado)', async () => {
    const asService = await connectAs('service_role');
    const result = await asService.query('select count(*)::int as count from public.clients');
    expect(result.rows[0].count).toBeGreaterThanOrEqual(2);
    await close(asService);
  });

  it('service_role consegue inserir auditoria diretamente (único caminho de escrita)', async () => {
    const asService = await connectAs('service_role');
    const insert = await asService.query(
      `insert into public.audit_logs (action, target_type, target_id, client_id)
       values ('test.event', 'client', $1, $1) returning id`,
      [CLIENT_A],
    );
    expect(insert.rowCount).toBe(1);
    await close(asService);
  });

  it('anon (sem sessão) não lê nenhum cliente nem assinatura', async () => {
    const asAnon = await connectAs('anon');
    const clients = await asAnon.query('select id from public.clients');
    const subs = await asAnon.query('select id from public.subscriptions');
    expect(clients.rowCount).toBe(0);
    expect(subs.rowCount).toBe(0);
    await close(asAnon);
  });

  it('usuário autenticado comum não consegue inserir em audit_logs (sem policy de INSERT)', async () => {
    const asA = await connectAs('authenticated', IDENTITY_A_SUB);
    await expect(
      asA.query(
        `insert into public.audit_logs (action, target_type, target_id, client_id)
         values ('forjado', 'client', $1, $1)`,
        [CLIENT_A],
      ),
    ).rejects.toThrow();
    await close(asA);
  });
});

afterAll(async () => {
  // Sem drop explícito do banco de teste aqui: o próximo `beforeAll`
  // (próxima execução da suíte) já recria do zero via resetTestDatabase().
});
