import { expect, type Page } from '@playwright/test';
import { activeRecordDialog, locateCreatedRecord, openObjectList } from '../support/salesforce-records';
export class SalesforceAccountsPage {
  constructor(private readonly page: Page) { }
  async create(name: string): Promise<string> {
    await openObjectList(this.page, 'Account');
    await this.page.getByRole('button', { name: 'New', exact: true }).first().click();
    const dialog = activeRecordDialog(this.page);
    await expect(dialog).toBeVisible();
    const nameInput = dialog.locator('input[name="Name"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill(name);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    return locateCreatedRecord(this.page, 'Account', name);
  }
}
