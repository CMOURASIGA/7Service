import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../../app/(admin)/acessos/page.tsx', import.meta.url), 'utf8');
const client = readFileSync(new URL('./commander-account-status.ts', import.meta.url),'utf8');
describe('Commander account readback', () => {
  it('does not hardcode every destination as not verified', () => {
    expect(page).toContain('readCommanderAccountStates(checks)');
    expect(page).toContain("row.destination = 'Conta confirmada'");
    expect(page).toContain("row.destination = 'Pendente'");
    expect(page).toContain("row.destination = 'Divergente'");
  });
  it('uses signed read-only queries and no profile writes', () => {
    expect(client).toContain("operation: 'CHECK_ACCOUNTS'");
    expect(client).toContain("createHmac('sha256', secret)");
    expect(client).toContain("redirect: 'error'");
    expect(client).not.toContain('auth.admin.createUser');
  });
});
