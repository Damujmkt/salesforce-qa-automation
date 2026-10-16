import { google } from 'googleapis';
import fs from 'node:fs/promises';
import path from 'node:path';
import { envOr, requiredEnv } from './config';

const TIMEOUT_MS = 90_000;
const POLL_MS = 3_000;

function decode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

type GmailPart = {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: GmailPart[] | null;
};

function collectBodies(part?: GmailPart | null): { plain: string[]; html: string[] } {
  const result = { plain: [] as string[], html: [] as string[] };
  if (!part) return result;
  if (part.body?.data) {
    const content = decode(part.body.data);
    if (part.mimeType === 'text/plain') result.plain.push(content);
    else if (part.mimeType === 'text/html') result.html.push(content);
  }
  for (const child of part.parts ?? []) {
    const nested = collectBodies(child);
    result.plain.push(...nested.plain);
    result.html.push(...nested.html);
  }
  return result;
}

export function extractOtpCode(content: string, customPattern?: string): string | null {
  const normalized = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ');

  const regex = customPattern
    ? new RegExp(customPattern, 'i')
    : /(?:verification|security|confirmation)\s+code\s*(?:is|:|-)?\s*(\d{6,8})\b/i;
  return regex.exec(normalized)?.[1] ?? null;
}

async function gmailClient() {
  const client = JSON.parse(await fs.readFile(path.resolve('secrets/google-oauth-client.json'), 'utf8'));
  const desktop = client.installed;
  if (!desktop?.client_id || !desktop?.client_secret) {
    throw new Error('Expected Google OAuth Desktop client JSON in secrets/google-oauth-client.json');
  }
  const token = JSON.parse(await fs.readFile(path.resolve('secrets/gmail-token.json'), 'utf8'));
  if (!token.refresh_token) throw new Error('Gmail refresh token missing. Run npm run auth:gmail.');

  const oauth = new google.auth.OAuth2(desktop.client_id, desktop.client_secret);
  oauth.setCredentials({ refresh_token: token.refresh_token });
  return google.gmail({ version: 'v1', auth: oauth });
}

function header(headers: Array<{ name?: string | null; value?: string | null }> | undefined, name: string): string {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function senderAddress(from: string): string {
  return (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
}

export async function getVerificationCode(requestedAfter: number): Promise<string> {
  const sender = requiredEnv('GMAIL_SENDER').toLowerCase();
  const subjectKeyword = requiredEnv('GMAIL_SUBJECT_KEYWORD').toLowerCase();
  const gmail = await gmailClient();
  const deadline = Date.now() + TIMEOUT_MS;
  const afterSeconds = Math.floor(requestedAfter / 1000) - 1;
  const query = `from:${sender} after:${afterSeconds}`;
  const inspected = new Set<string>();

  while (Date.now() < deadline) {
    try {
      const list = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 30 });
      for (const candidate of list.data.messages ?? []) {
        if (!candidate.id || inspected.has(candidate.id)) continue;
        const msg = (await gmail.users.messages.get({
          userId: 'me', id: candidate.id, format: 'full'
        })).data;
        const receivedAt = Number(msg.internalDate ?? 0);
        if (receivedAt < requestedAfter) {
          inspected.add(candidate.id);
          continue;
        }
        const headers = msg.payload?.headers ?? [];
        if (senderAddress(header(headers, 'From')) !== sender) {
          inspected.add(candidate.id);
          continue;
        }
        if (!header(headers, 'Subject').toLowerCase().includes(subjectKeyword)) {
          inspected.add(candidate.id);
          continue;
        }
        const parts = collectBodies(msg.payload as GmailPart);
        const body = parts.plain.join('\n') || parts.html.join('\n') || msg.snippet || '';
        const code = extractOtpCode(body, process.env.SF_OTP_REGEX);
        if (code) {
          console.log('Fresh matching Salesforce verification email located.');
          return code;
        }
        inspected.add(candidate.id);
      }
    } catch (error: unknown) {

      const msg = error instanceof Error ? error.message : String(error);
      if (/invalid_grant|invalid_client|unauthorized|insufficient permissions|403/i.test(msg)) {
        throw new Error('Gmail OAuth authorization expired or was revoked. Run npm run auth:gmail again.');
      }
      throw new Error(`Gmail API error while searching verification email: ${msg}`);
    }
    await new Promise(resolve => setTimeout(resolve, POLL_MS));
  }
  throw new Error('No fresh Salesforce verification email was found within 90 seconds. Check Gmail sender, subject and OTP pattern.');
}
