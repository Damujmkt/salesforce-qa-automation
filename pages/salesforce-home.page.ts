import { expect, type Page } from '@playwright/test';
import { envOr, requiredEnv } from '../auth/config';

export class SalesforceHomePage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto(requiredEnv('SF_ORG_URL'), { waitUntil: 'domcontentloaded' });
  }

  async expectAuthenticated(): Promise<void> {
    const selector = envOr('SF_AUTH_READY_SELECTOR',
      'button[title="App Launcher"], button[aria-label="App Launcher"], .slds-global-header');
    await expect(this.page.locator(selector).first()).toBeVisible();
    expect(this.page.url()).not.toMatch(/login\.salesforce\.com|identity\/verification/i);
  }
}
