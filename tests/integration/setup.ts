import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from 'pg';

/**
 * Infraestrutura dos testes de integração/RLS. Sobe um banco Postgres
 * efêmero, aplica as migrations reais (`supabase/migrations`) na mesma
 * ordem de produção, cria os papéis anon/authenticated/service_role
 * (ver fixtures/supabase-stubs.sql) e semeia dados determinísticos de
 * dois tenants (fixtures/seed.sql).
 *
 * Valida RLS com a mesma engine que o Supabase usa (Postgres), mas SEM a
 * plataforma Supabase em si — ver docs/TESTING.md para o que continua
 * dependendo do projeto real (Storage, GoTrue/PostgREST, concorrência).
 */

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(dirname, '../../supabase/migrations');
const fixturesDir = path.resolve(dirname, './fixtures');

const PG_HOST = process.env.PGHOST ?? 'localhost';
const PG_PORT = Number(process.env.PGPORT ?? 5432);
const PG_SUPERUSER = process.env.PG_SUPERUSER ?? 'postgres';
const PG_SUPERPASSWORD = process.env.PG_SUPERPASSWORD ?? 'postgres_test_pw';
export const TEST_DB = process.env.PG_TEST_DB ?? 'sevenservice_rls_test';

const TEST_RUNNER_USER = 'test_runner';
const TEST_RUNNER_PASSWORD = 'test_runner_pw';

async function adminClient(database: string) {
  const client = new Client({
    host: PG_HOST,
    port: PG_PORT,
    user: PG_SUPERUSER,
    password: PG_SUPERPASSWORD,
    database,
  });
  await client.connect();
  return client;
}

export async function resetTestDatabase(): Promise<void> {
  const admin = await adminClient('postgres');
  await admin.query(
    `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
    [TEST_DB],
  );
  await admin.query(`drop database if exists ${TEST_DB}`);
  await admin.query(`create database ${TEST_DB}`);
  await admin.end();

  const db = await adminClient(TEST_DB);
  try {
    await db.query('create extension if not exists pgcrypto');
    await db.query(await readFile(path.join(fixturesDir, 'supabase-stubs.sql'), 'utf8'));

    const migrationFiles = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
    for (const file of migrationFiles) {
      await db.query(await readFile(path.join(migrationsDir, file), 'utf8'));
    }

    await db.query(await readFile(path.join(fixturesDir, 'grants.sql'), 'utf8'));
    await db.query(await readFile(path.join(fixturesDir, 'seed.sql'), 'utf8'));
  } finally {
    await db.end();
  }
}

export type SupabaseRole = 'anon' | 'authenticated' | 'service_role';

/**
 * Conecta como `test_runner` (login role sem privilégios próprios) e
 * assume o papel Supabase informado via SET ROLE — o mesmo mecanismo que
 * o PostgREST usa por trás de cada requisição real. `authUserSub` simula
 * o `sub` do JWT decodificado (o que `auth.uid()` lê).
 */
export async function connectAs(role: SupabaseRole, authUserSub?: string): Promise<Client> {
  const client = new Client({
    host: PG_HOST,
    port: PG_PORT,
    user: TEST_RUNNER_USER,
    password: TEST_RUNNER_PASSWORD,
    database: TEST_DB,
  });
  await client.connect();
  await client.query(`set role ${role}`);
  await client.query(`select set_config('request.jwt.claim.sub', $1, false)`, [authUserSub ?? '']);
  return client;
}
