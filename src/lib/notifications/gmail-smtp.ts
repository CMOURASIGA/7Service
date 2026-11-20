import 'server-only';
import { connect, type TLSSocket } from 'node:tls';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';

type SendRequest = {
  username: string;
  appPassword: string;
  recipient: string;
  subject: string;
  text: string;
};

const GMAIL_HOST = 'smtp.gmail.com';
const GMAIL_PORT = 465;
const EMAIL_RE = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;

function validEmail(address: string): boolean {
  return EMAIL_RE.test(address) && address.length < 255;
}

/** ASCII-only RFC 2047 subject and base64 MIME body, without header injection. */
export function formatSmtpMessage(request: Pick<SendRequest, 'username' | 'recipient' | 'subject' | 'text'>): string {
  if (!validEmail(request.username) || !validEmail(request.recipient)) {
    throw new Error('Invalid mail address');
  }
  if (!request.subject || /[\r\n]/.test(request.subject) || request.subject.length > 180) {
    throw new Error('Invalid mail subject');
  }
  const encodedSubject = Buffer.from(request.subject, 'utf8').toString('base64');
  const encodedBody = Buffer.from(request.text.replace(/\r\n?/g, '\n'), 'utf8')
    .toString('base64').match(/.{1,76}/g)?.join('\r\n') ?? '';
  const sender = Buffer.from('Consult Services', 'utf8').toString('base64');
  return [
    `From: =?UTF-8?B?${sender}?= <${request.username}>`,
    `To: <${request.recipient}>`,
    `Subject: =?UTF-8?B?${encodedSubject}?=`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@consultservices.com.br>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '', encodedBody, '',
  ].join('\r\n');
}

class SmtpReplies {
  private buffered = '';
  private lines: string[] = [];
  private pending: { resolve: (line: string) => void; reject: (error: Error) => void } | null = null;
  private failure: Error | null = null;
  constructor(private readonly socket: TLSSocket) {
    socket.on('data', chunk => this.receive(chunk.toString('utf8')));
    socket.on('error', () => this.fail(new Error('SMTP transport error')));
    socket.on('close', () => this.fail(new Error('SMTP connection closed')));
  }
  private receive(chunk: string) {
    this.buffered += chunk;
    if (this.buffered.length > 65536) {
      this.socket.destroy(new Error('SMTP reply exceeds limit'));
      return;
    }
    while (this.buffered.includes('\n')) {
      const i = this.buffered.indexOf('\n');
      const line = this.buffered.slice(0, i).replace(/\r$/, '');
      this.buffered = this.buffered.slice(i + 1);
      if (this.pending) {
        const pending = this.pending;
        this.pending = null;
        pending.resolve(line);
      } else {
        this.lines.push(line);
      }
    }
  }
  private fail(error: Error) {
    this.failure = error;
    if (this.pending) {
      const pending = this.pending;
      this.pending = null;
      pending.reject(error);
    }
  }
  private readLine(): Promise<string> {
    if (this.lines.length) return Promise.resolve(this.lines.shift()!);
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => { this.pending = { resolve, reject }; });
  }
  async expect(...expected: number[]): Promise<void> {
    for (let index = 0; index < 60; index++) {
      const line = await this.readLine();
      const match = /^(\d{3})([ -])/.exec(line);
      if (!match) throw new Error('Malformed SMTP reply');
      if (match[2] === '-') continue;
      const status = Number(match[1]);
      if (!expected.includes(status)) throw new Error(`SMTP rejected operation (status ${status})`);
      return;
    }
    throw new Error('SMTP reply limit exceeded');
  }
  async command(line: string, ...expected: number[]) {
    this.socket.write(line + '\r\n');
    await this.expect(...expected);
  }
}

/** Gmail SMTP over validated TLS 1.2+, port 465. No third-party dependency. */
export async function sendGmailSmtpMessage(request: SendRequest): Promise<void> {
  const username = request.username.trim().toLowerCase();
  if (!validEmail(username) || !username.endsWith('@gmail.com')) {
    throw new Error('The configured Gmail sender is invalid');
  }
  const password = request.appPassword.replace(/\s+/g, '');
  if (!password) throw new Error('Gmail SMTP app password is missing');
  const message = formatSmtpMessage({ ...request, username });
  const socket = connect({
    host: GMAIL_HOST, port: GMAIL_PORT, servername: GMAIL_HOST,
    rejectUnauthorized: true, minVersion: 'TLSv1.2',
  });
  const replies = new SmtpReplies(socket);
  const timeout = setTimeout(() => socket.destroy(new Error('SMTP timed out')), 12_000);
  try {
    await once(socket, 'secureConnect');
    await replies.expect(220);
    await replies.command('EHLO portal.consultservices.com.br', 250);
    await replies.command('AUTH LOGIN', 334);
    await replies.command(Buffer.from(username).toString('base64'), 334);
    await replies.command(Buffer.from(password).toString('base64'), 235);
    await replies.command(`MAIL FROM:<${username}>`, 250);
    await replies.command(`RCPT TO:<${request.recipient}>`, 250, 251);
    await replies.command('DATA', 354);
    socket.write(message + '.\r\n');
    // 250 means Gmail SMTP accepted the message, not proof of inbox delivery.
    await replies.expect(250);
    socket.write('QUIT\r\n');
  } finally {
    clearTimeout(timeout);
    socket.end();
    socket.destroy();
  }
}
