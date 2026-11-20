import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL('../../../' + path, import.meta.url), 'utf8');

describe('customer onboarding links', () => {
  it('sends initial invites to the permanent public production portal', () => {
    const actions = read('src/app/(admin)/usuarios/actions.ts');
    expect(actions).toContain("const siteOrigin = 'https://portal.consultservices.com.br'");
    expect(actions).toContain("new URL('/aceitar-convite', siteOrigin)");
    expect(actions).not.toContain("process.env.VERCEL_URL");
  });
  it('moves legacy preview invite links to the public portal preserving tokens', () => {
    const form = read('src/features/auth/components/set-password-form.tsx');
    expect(form).toContain("target.host = 'portal.consultservices.com.br'");
    expect(form).toContain("window.location.replace(target.toString())");
    expect(form).toContain('new URL(window.location.href)');
    expect(form).toContain(String.raw`/^7service-git-[a-z0-9-]+\.vercel\.app$/i`);
    expect(form).not.toContain("onAuthStateChange(() =>");
    expect(form).toContain("event === 'SIGNED_OUT'");
  });
  it('uses the permanent public portal for both recovery entry points', () => {
    const actions = read('src/app/(admin)/usuarios/[id]/actions.ts');
    expect(actions).toContain("redirectTo: 'https://portal.consultservices.com.br/redefinir-senha'");
    expect(actions).toContain("const origin = 'https://portal.consultservices.com.br'");
    expect(actions).toContain("new URL('/redefinir-senha', origin)");
  });
});
