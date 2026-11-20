import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatSmtpMessage } from './gmail-smtp';

const source = readFileSync(new URL('./welcome-email.ts', import.meta.url), 'utf8');
const smtpSource = readFileSync(new URL('./gmail-smtp.ts', import.meta.url), 'utf8');

describe('Gmail SMTP welcome email', () => {
  it('uses SMTP app credentials only when configured', () => {
    expect(source).toContain('WELCOME_SMTP_USER');
    expect(source).toContain('WELCOME_SMTP_APP_PASSWORD');
    expect(source).toContain('sendGmailSmtpMessage');
    expect(source).not.toContain('RESEND_API_KEY');
    expect(source).toContain('https://portal.consultservices.com.br/entrar');
    expect(source).toContain("status: 'RESERVED'");
    expect(source).toContain("status: success ? 'SENT' : 'FAILED'");
    expect(source).toContain('activationAge > 15 * 60 * 1000');
  });
  it('uses verified TLS and the existing Gmail provider', () => {
    expect(smtpSource).toContain("const GMAIL_HOST = 'smtp.gmail.com'");
    expect(smtpSource).toContain('const GMAIL_PORT = 465');
    expect(smtpSource).toContain('rejectUnauthorized: true');
    expect(smtpSource).toContain("minVersion: 'TLSv1.2'");
    expect(smtpSource).toContain("replies.command('AUTH LOGIN', 334)");
    expect(smtpSource).toContain('await replies.expect(250)');
  });
  it('produces safe UTF-8 MIME text with a branded link', () => {
    const email = formatSmtpMessage({
      username: 'contactconsultservices@gmail.com',
      recipient: 'recipient@example.com',
      subject: 'Seu acesso à Consult Services está pronto',
      text: 'Olá!\nhttps://portal.consultservices.com.br/entrar',
    });
    expect(email).toContain('Content-Transfer-Encoding: base64');
    expect(email).toContain('To: <recipient@example.com>');
    expect(email).toContain('Subject: =?UTF-8?B?');
    expect(email).not.toContain('Olá!');
    const encodedBody = email.split('\r\n\r\n')[1].trim();
    expect(Buffer.from(encodedBody, 'base64').toString('utf8')).toContain('portal.consultservices.com.br/entrar');
  });
  it('rejects SMTP header injection', () => {
    expect(() => formatSmtpMessage({
      username: 'contactconsultservices@gmail.com',
      recipient: 'recipient@example.com',
      subject: 'Hello\r\nBCC: malicious@example.com', text: 'test',
    })).toThrow('Invalid mail subject');
    expect(() => formatSmtpMessage({
      username: 'contactconsultservices@gmail.com',
      recipient: 'a@example.com\r\nBcc: other@example.com',
      subject: 'test', text: 'test',
    })).toThrow('Invalid mail address');
  });
});
