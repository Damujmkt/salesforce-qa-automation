import { expect, type Page } from '@playwright/test';
import { locateCreatedRecord, openObjectList } from '../support/salesforce-records';
import type { LeadData } from '../support/lead-data';
export class SalesforceContactsPage {
  constructor(private readonly page: Page) { }
  async create(data: LeadData, accountName: string): Promise<string> {
    await openObjectList(this.page, 'Contact');
    await this.page.getByRole('button', { name: 'New', exact: true }).first().click();
    const dialog = this.page.getByRole('dialog', {
      name: 'New Contact',
      exact: true
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'First Name' }).fill(data.firstName);
    await dialog.getByRole('textbox', { name: 'Last Name' }).fill(data.lastName);
    const accountLookup = dialog.getByRole('combobox', {
      name: 'Account Name',
      exact: true
    });
    await expect(accountLookup).toBeVisible();
    const selectedAccount = dialog.locator('input[role="combobox"][aria-label="Account Name"][readonly]');
    const isSelected = async (): Promise<boolean> => (await selectedAccount.count()) > 0 &&
      (await selectedAccount.first().getAttribute('data-value')) === accountName;
    let lastIssue = 'No matching option was displayed';
    for (const query of [null, accountName, accountName.slice(0, -2), '']) {
      if (await isSelected())
        break;
      if (query === null) {
        await accountLookup.click();
      }
      else {
        await accountLookup.fill(query);
        if (query === '')
          await accountLookup.click();
      }
      const option = this.page.getByRole('option')
        .filter({ hasText: accountName })
        .filter({ visible: true })
        .first();
      try {
        await option.click({ timeout: 6000 });
        await expect(selectedAccount).toHaveAttribute('data-value', accountName, { timeout: 4000 });
        break;
      }
      catch (error) {
        if (await isSelected())
          break;
        lastIssue = error instanceof Error ? error.message : String(error);
        const choices = await this.page.getByRole('option')
          .filter({ visible: true }).allTextContents();
        if (choices.length === 1 && choices[0].trim().includes(accountName)) {
          await accountLookup.press('ArrowDown');
          await accountLookup.press('Enter');
          if (await isSelected())
            break;
        }
      }
    }
    if (!(await isSelected())) {
      const choices = await this.page.getByRole('option')
        .filter({ visible: true }).allTextContents();
      throw new Error(`Unable to select Account "${accountName}" in New Contact. ` +
        `Visible options: ${JSON.stringify(choices)}. Last issue: ${lastIssue}`);
    }
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    return locateCreatedRecord(this.page, 'Contact', `${data.firstName} ${data.lastName}`);
  }
}
