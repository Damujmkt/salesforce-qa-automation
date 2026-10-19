import { chromium, webkit, type Browser, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { envOr, requiredEnv } from './config';
import { getVerificationCode } from './gmail-otp.provider';
export type SupportedBrowser = 'chromium' | 'webkit';
export const authStatePath = (browser: SupportedBrowser) => path.resolve(`playwright/.auth/${browser}.json`);
const loginUrl = () => envOr('SF_LOGIN_URL', 'https://login.salesforce.com/');
const orgUrl = () => requiredEnv('SF_ORG_URL');
const readySelector = () => envOr('SF_AUTH_READY_SELECTOR', 'button[title="App Launcher"], button[aria-label="App Launcher"], .slds-global-header');
const otpInputSelector = '#emc';
const otpSubmitSelector = 'button:has-text("Verify"), input[type="submit"][value*="Verify"]';
function looksLikeLogin(url: string): boolean {
  return /\/login|\/secur\/frontdoor|identity\/verification|challenge|login\.salesforce\.com/i.test(url);
}
async function validateSession(page: Page): Promise<boolean> {
  try {
    await page.goto(orgUrl(), { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (looksLikeLogin(page.url()))
      return false;
    await page.locator(readySelector()).first().waitFor({ state: 'visible', timeout: 15000 });
    return !looksLikeLogin(page.url());
  }
  catch {
    return false;
  }
}
async function completeLogin(page: Page): Promise<void> {
  await page.goto(loginUrl(), { waitUntil: 'domcontentloaded' });
  await page.locator('#username').fill(requiredEnv('SF_USERNAME'));
  await page.locator('#Login').click();
  await page.locator('#password').fill(requiredEnv('SF_PASSWORD'));
  const requestedAfter = Date.now();
  await page.locator('#Login').click();
  const otpInput = page.locator(otpInputSelector);
  const outcome = await Promise.any([
    otpInput.waitFor({ state: 'visible', timeout: 60000 }).then(() => 'otp' as const),
    page.locator(readySelector()).first().waitFor({ state: 'visible', timeout: 60000 })
      .then(() => 'ready' as const)
  ]).catch(() => {
    throw new Error(`Salesforce login did not show OTP or Lightning UI: ${page.url()}`);
  });
  if (outcome === 'otp') {
    const otp = await getVerificationCode(requestedAfter);
    await otpInput.fill(otp);
    await page.locator(otpSubmitSelector).first().click();
    await page.locator(readySelector()).first().waitFor({ state: 'visible', timeout: 60000 });
  }
  if (looksLikeLogin(page.url()))
    throw new Error('Salesforce login did not complete.');
}
export async function ensureAuthenticated(browserName: SupportedBrowser): Promise<void> {
  const stateFile = authStatePath(browserName);
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  const browserType = browserName === 'chromium' ? chromium : webkit;
  let browser: Browser | undefined;
  try {
    browser = await browserType.launch();
    if (fs.existsSync(stateFile)) {
      const cached = await browser.newContext({ storageState: stateFile });
      try {
        if (await validateSession(await cached.newPage())) {
          console.log(`${browserName}: cached Salesforce session valid.`);
          return;
        }
        console.log(`${browserName}: cached session invalid; reauthentication required.`);
      }
      finally {
        await cached.close();
      }
    }
    const context: BrowserContext = await browser.newContext();
    try {
      const page = await context.newPage();
      await completeLogin(page);
      if (!await validateSession(page)) {
        throw new Error('Authenticated Salesforce UI not verified; state not saved.');
      }
      await context.storageState({ path: stateFile });
      console.log(`${browserName}: Salesforce session refreshed and cached.`);
    }
    finally {
      await context.close();
    }
  }
  finally {
    await browser?.close();
  }
}
