import { authenticate } from '@google-cloud/local-auth';
import fs from 'node:fs/promises';
import path from 'node:path';
const CLIENT_FILE = path.resolve('secrets/google-oauth-client.json');
const TOKEN_FILE = path.resolve('secrets/gmail-token.json');
async function main(): Promise<void> {
  const auth = await authenticate({
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    keyfilePath: CLIENT_FILE
  });
  const refreshToken = auth.credentials.refresh_token;
  if (!refreshToken) {
    throw new Error('Google did not return a refresh token. Revoke this app in Google Account permissions, then authorize again.');
  }
  await fs.mkdir(path.dirname(TOKEN_FILE), { recursive: true });
  await fs.writeFile(TOKEN_FILE, JSON.stringify({ refresh_token: refreshToken }, null, 2), {
    encoding: 'utf8', mode: 0o600, flag: 'w'
  });
  console.log('Gmail OAuth complete. Refresh token saved locally (not printed).');
}
main().catch((error: unknown) => {
  console.error('Gmail OAuth failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
