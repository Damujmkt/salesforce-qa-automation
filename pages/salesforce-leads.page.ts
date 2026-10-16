import { expect, type Locator, type Page } from '@playwright/test';
import type { LeadData } from '../support/lead-data';

export class SalesforceLeadsPage {
  constructor(private readonly page: Page) { }

  private get dialog(): Locator {
    return this.page.locator(
      'div.slds-modal[role="dialog"][aria-modal="true"]'
    );
  }

  async openSalesApp(): Promise<void> {
    await this.page.locator('button[title="App Launcher"], button[aria-label="App Launcher"]').first().click();
    const sales = this.page.getByRole('link', { name: 'Sales', exact: true });
    if (await sales.count()) {
      await sales.first().click();
    } else {
      await this.page.getByText('Sales', { exact: true }).last().click();
    }
    await expect(this.page.getByRole('link', { name: 'Leads', exact: true }).first()).toBeVisible();
  }

  async openLeads(): Promise<void> {
    await this.page.getByRole('link', { name: 'Leads', exact: true }).first().click();
    await expect(this.page.getByRole('button', { name: 'New', exact: true }).first()).toBeVisible();
  }

  async create(data: LeadData): Promise<void> {
    await this.page.getByRole('button', { name: 'New', exact: true }).first().click();
    await expect(this.dialog).toBeVisible();
    await this.dialog.getByRole('textbox', { name: 'First Name' }).fill(data.firstName);
    await this.dialog.getByRole('textbox', { name: 'Last Name' }).fill(data.lastName);
    await this.dialog.getByRole('textbox', { name: 'Company' }).fill(data.company);
    await this.dialog.getByRole('textbox', { name: 'Email' }).fill(data.email);
    await this.choose('Lead Source', data.leadSource);
    await this.dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(this.dialog).toBeHidden();
    const name = `${data.firstName} ${data.lastName}`;
    const recordLink = this.page.getByRole('link', { name, exact: true }).first();
    await expect(recordLink).toBeVisible();
    await recordLink.click();
    await expect(this.page).toHaveURL(/\/lightning\/r\/Lead\//);
  }

  async updateStatus(status: string): Promise<void> {
    const actionsMenu = this.page.locator(
      'lightning-button-menu[data-target-reveals*="sfdc:StandardButton.Lead.Edit"]'
    );

    await actionsMenu.getByRole('button', {
      name: 'Show more actions'
    }).click();

    await actionsMenu.getByRole('menuitem', {
      name: 'Edit',
      exact: true
    }).click();

    await expect(this.dialog).toBeVisible();

    const leadStatus = this.dialog.getByRole('combobox', {
      name: 'Lead Status',
      exact: true
    });

    await leadStatus.click();

    const statusOption = this.page
      .getByRole('listbox', { name: 'Lead Status' })
      .locator('lightning-base-combobox-item[role="option"]')
      .filter({
        has: this.page.locator(`[title="${status}"]`)
      });

    await expect(statusOption).toBeVisible();
    await statusOption.click();
    await expect(leadStatus).toHaveAttribute('data-value', status);
    await this.dialog.locator('button[name="SaveEdit"]').click();
    await expect(this.dialog).toBeHidden();
  }

  async expectDetails(data: LeadData): Promise<void> {
    const detailsTab = this.page.getByRole('tab', { name: 'Details', exact: true });
    if (await detailsTab.count()) await detailsTab.click();
    await expect(this.page.getByText(`${data.firstName} ${data.lastName}`, { exact: true }).first()).toBeVisible();
    await expect(this.page.getByText(data.company, { exact: true }).first()).toBeVisible();
    await expect(this.page.getByText(data.email, { exact: true }).first()).toBeVisible();
  }

  async expectStatus(status: string): Promise<void> {
    const detailsTab = this.page.getByRole('tab', {
      name: 'Details',
      exact: true
    });

    await detailsTab.click();
    const leadStatusField = this.page
      .locator('div.test-id__output-root')
      .filter({
        has: this.page.locator('.test-id__field-label', {
          hasText: 'Lead Status'
        })
      });

    const statusValue = leadStatusField.locator(
      'lightning-formatted-text[data-output-element-id="output-field"]'
    );

    await expect(statusValue).toHaveText(status);
  }

  getRecordId(): string {
    const match = this.page.url().match(/\/lightning\/r\/Lead\/([a-zA-Z0-9]{15,18})(?:\/|\?|$)/);
    if (!match) throw new Error(`Lead record ID not found in URL: ${this.page.url()}`);
    return match[1];
  }

  private async choose(label: string, value: string): Promise<void> {
    const name = label === 'Status' ? /^(Lead )?Status$/i : label;
    const field = this.dialog.getByRole('combobox', { name });
    const button = this.dialog.getByRole('button', { name });
    const trigger = (await field.count()) ? field.first() : button.first();
    await trigger.click();
    await this.page.getByRole('option', { name: value, exact: true }).click();
  }
}
