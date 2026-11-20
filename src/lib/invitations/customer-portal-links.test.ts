import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL('../../../' + path, import.meta.url), 'utf8');

describe('customer onboarding links', () => {
  it('sends initial invites to the permanent public production portal', () => {
    const actions = read('src/app/(admin)/usuarios/actions.ts');
    expect(actions).toContain("const siteOrigin = 'https://7service.vercel.app'");
    expect(actions).toContain("new URL('/aceitar-convite', siteOrigin)");
    expect(actions).not.toContain("process.env.VERCEL_URL");
  });
  it('uses the permanent public portal for both recovery entry points', () => {
    const actions = read('src/app/(admin)/usuarios/[id]/actions.ts');
    expect(actions).toContain("redirectTo: 'https://7service.vercel.app/redefinir-senha'");
    expect(actions).toContain("const origin = 'https://7service.vercel.app'");
    expect(actions).toContain("new URL('/redefinir-senha', origin)");
  });
});
