#!/usr/bin/env node
/**
 * Static migration safety gate for the existing 7Service Supabase project.
 *
 * Does not access credentials or databases. It prevents dangerous migration
 * patterns from being merged unnoticed, but is NOT a substitute for real
 * SQL execution, RLS tests or migration rollback testing in homologation.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = join(process.cwd(), 'supabase', 'migrations');
const scripts = readdirSync(root)
  .filter(name => /^202611(08|09)\d{6}_.*\.sql$/.test(name))
  .sort();

assert(scripts.length >= 8, 'Expected at least eight additive central-provisioning migrations');

const all = scripts.map(name => ({
  name,
  contents: readFileSync(join(root, name), 'utf8'),
}));

for (const { name, contents } of all) {
  const sql = contents.toUpperCase();
  assert(!/\bDROP\s+(DATABASE|SCHEMA|TABLE|FUNCTION|ROLE|POLICY)\b/.test(sql),
    `${name}: destructive DROP is prohibited`);
  assert(!/\b(TRUNCATE|DELETE\s+FROM\s+PUBLIC\.|CREATE\s+DATABASE)\b/.test(sql),
    `${name}: destructive data statement is prohibited`);
  assert(/\bBEGIN\s*;/.test(sql) && /\bCOMMIT\s*;/.test(sql),
    `${name}: migration must be a transaction`);
  assert(!/GRANT\s+(ALL|INSERT|UPDATE|DELETE)\s+ON\s+.+\s+TO\s+(PUBLIC|ANON|AUTHENTICATED)/.test(sql),
    `${name}: direct write grants to public clients are prohibited`);
}

const base = all.find(file => file.name.includes('central_provisioning_additive'));
assert(base, 'Missing central provisioning base migration');
for (const relation of [
  'customer_groups','customer_group_members','contract_seat_pools',
  'contract_product_entitlements','contract_named_seats',
  'environment_connections','environment_company_bindings',
  'destination_auth_links','provisioning_operations',
]) assert(base.contents.includes(relation), `Missing expected private relation: ${relation}`);

const roles = all.find(file => file.name.includes('contract_role_assignments'));
assert(roles && roles.contents.includes('contract_role_assignments_one_effective_role'),
  'Role assignment must prevent multiple effective roles');
const seats = all.find(file => file.name.includes('contract_seat_reconciliation'));
assert(seats && seats.contents.includes('RECONCILIATION_NOT_READY'),
  'Cutover must be blocked until shadow reconciliation succeeds');
const seatAtomic = all.find(file => file.name.includes('contract_named_seat_atomic'));
assert(seatAtomic && !/\bop\.access_id\b/.test(seatAtomic.contents),
  'Seat release must not refer to nonexistent provisioning_operations.access_id');
assert(seatAtomic.contents.includes('RECONCILIATION_REQUIRED'),
  'Seat release must retain licenses while destination operations are unresolved');
assert(seats.contents.includes('LEGACY_REMOTE_IDENTITIES_NOT_MAPPED'),
  'Named licensing cutover must verify every legacy destination identity');
assert(seats.contents.includes('DESTINATION_OPERATIONS_UNRESOLVED'),
  'Named licensing cutover must refuse uncertain remote access operations');

const connection = all.find(file => file.name.includes('connection_atomic'));
assert(connection && connection.contents.includes('encrypted_admin_key'),
  'Connections must persist encrypted credentials, not plain keys');

const legacy = all.find(file => file.name.includes('legacy_access_named_contract_guard'));
assert(legacy, 'Legacy access bypass guard migration must exist');
assert((legacy.contents.match(/LEGACY_ACCESS_BLOCKED_FOR_NAMED_CONTRACT/g) ?? []).length === 2,
  'Both legacy GRANT and reactivation RPCs must refuse ENFORCED nominal contracts');
const lifecycle = all.find(file => file.name.includes('contract_role_revocation_lifecycle'));
assert(lifecycle && lifecycle.contents.includes('DESTINATION_OPERATION_ALREADY_PENDING'),
  'Remote revocation must reject simultaneous grant or revoke operations');

console.log(`PASS: ${scripts.length} staged provisioning migrations passed static safety checks.`);
