import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('./welcome-email.ts',import.meta.url),'utf8');
describe('welcome email delivery contract',()=>{
  it('uses the public portal and avoids passwords and tokens',()=>{
    expect(source).toContain('https://portal.consultservices.com.br/entrar');
    expect(source).toContain('RESEND_API_KEY');
    expect(source).toContain('WELCOME_EMAIL_FROM');
    expect(source).toContain("status: 'RESERVED'");
    expect(source).toContain("'Idempotency-Key'");
    expect(source).not.toContain('resetPasswordForEmail');
  });
});
