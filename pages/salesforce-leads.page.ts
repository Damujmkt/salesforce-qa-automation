import { expect, type Locator, type Page } from '@playwright/test';
import type { LeadData } from '../support/lead-data';
export class SalesforceLeadsPage {
  constructor(private readonly page: Page) { }
  private get dialog(): Locator {
    return this.page.locator('div.slds-modal[role="dialog"][aria-modal="true"]');
  }
  private async openNewLeadForm(): Promise<void> {
    const firstName = this.dialog.getByRole('textbox', {
      name: 'First Name', exact: true
    });
    const lastName = this.dialog.getByRole('textbox', {
      name: 'Last Name', exact: true
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt === 1) {
        console.warn('[lead] New Lead fields did not render; reopening once');
        await this.page.goto(new URL('/lightning/o/Lead/list', this.page.url()).toString(), { waitUntil: 'domcontentloaded' });
      }
      const newButton = this.page.getByRole('button', {
        name: 'New', exact: true
      }).first();
      await expect(newButton).toBeVisible({ timeout: 15000 });
      await newButton.click();
      try {
        await expect(firstName).toBeVisible({ timeout: 12000 });
        await expect(lastName).toBeVisible({ timeout: 8000 });
        return;
      }
      catch (error) {
        if (attempt === 1) {
          throw new Error(`New Lead form fields did not render after reopening. URL: ${this.page.url()}`, { cause: error });
        }
      }
    }
  }
  async openSalesApp(): Promise<void> {
    const salesHeading = this.page.getByRole('heading', { name: 'Sales', exact: true });
    const leadsNavigation = this.page.getByRole('link', { name: 'Leads', exact: true }).first();
    if (await salesHeading.isVisible().catch(() => false) &&
      await leadsNavigation.isVisible().catch(() => false))
      return;
    await this.page.locator('button[title="App Launcher"], button[aria-label="App Launcher"]').first().click();
    const sales = this.page.getByRole('link', { name: 'Sales', exact: true });
    if (await sales.count()) {
      await sales.first().click();
    }
    else {
      await this.page.getByText('Sales', { exact: true }).last().click();
    }
    await expect(this.page.getByRole('link', { name: 'Leads', exact: true }).first()).toBeVisible();
  }
  async openLeads(): Promise<void> {
    await this.page.getByRole('link', { name: 'Leads', exact: true }).first().click();
    await expect(this.page.getByRole('button', { name: 'New', exact: true }).first()).toBeVisible();
  }
  async create(data: LeadData): Promise<void> {
    await this.openNewLeadForm();
    await this.dialog.getByRole('textbox', { name: 'First Name' }).fill(data.firstName);
    await this.dialog.getByRole('textbox', { name: 'Last Name' }).fill(data.lastName);
    await this.dialog.getByRole('textbox', { name: 'Company' }).fill(data.company);
    await this.dialog.getByRole('textbox', { name: 'Email' }).fill(data.email);
    await this.choose('Lead Source', data.leadSource);
    await this.dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(this.dialog).toBeHidden();
    const name = `${data.firstName} ${data.lastName}`;
    const leadRecordUrl = /\/lightning\/r\/Lead\/[A-Za-z0-9]{15,18}\/view/;
    if (!leadRecordUrl.test(this.page.url())) {
      const recordLink = this.page.getByRole('link', { name, exact: true }).first();
      await expect(recordLink).toBeVisible();
      try {
        await recordLink.click({ timeout: 15000 });
      }
      catch (error) {
        if (!leadRecordUrl.test(this.page.url()))
          throw error;
      }
    }
    await expect(this.page).toHaveURL(leadRecordUrl);
  }
  async verifyRequiredFieldValidation(): Promise<void> {
    await this.openNewLeadForm();
    await this.dialog.getByRole('textbox', { name: 'First Name' }).fill('NegativeQA');
    await this.dialog.getByRole('textbox', { name: 'Last Name' }).fill('');
    await this.dialog.getByRole('textbox', { name: 'Company' }).fill('');
    await this.dialog.getByRole('button', { name: 'Save', exact: true }).click();
  }
  async verifyRequiredFieldErrors(): Promise<void> {
    const errorDialog = this.page.getByRole('dialog', {
      name: 'We hit a snag.'
    });
    await expect(errorDialog).toBeVisible();
    await expect(errorDialog.getByText('Review the following fields')).toBeVisible();
    await expect(errorDialog.getByRole('link', {
      name: 'Name',
      exact: true
    })).toBeVisible();
    await expect(errorDialog.getByRole('link', {
      name: 'Company',
      exact: true
    })).toBeVisible();
    await expect(errorDialog.getByRole('listitem')).toHaveCount(2);
    await expect(this.dialog).toBeVisible();
    const closeError = errorDialog.getByRole('button', {
      name: 'Close error dialog'
    });
    if (await closeError.isVisible()) {
      await closeError.click();
    }
    await this.dialog.getByRole('button', {
      name: 'Cancel',
      exact: true
    }).click();
    await expect(this.dialog).toBeHidden();
  }
  async attemptDuplicateEmailLead(data: LeadData): Promise<{
    duplicateWarning: boolean;
    createdId?: string;
  }> {
    const duplicateData: LeadData = {
      ...data,
      lastName: `${data.lastName}Duplicate`
    };
    await this.page.goto(new URL('/lightning/o/Lead/list', this.page.url()).toString(), { waitUntil: 'domcontentloaded' });
    await this.openNewLeadForm();
    await this.dialog.getByRole('textbox', {
      name: 'First Name'
    }).fill(duplicateData.firstName);
    await this.dialog.getByRole('textbox', {
      name: 'Last Name'
    }).fill(duplicateData.lastName);
    await this.dialog.getByRole('textbox', {
      name: 'Company'
    }).fill(data.company);
    await this.dialog.getByRole('textbox', {
      name: 'Email'
    }).fill(data.email);
    await this.choose('Lead Source', data.leadSource);
    await this.dialog.getByRole('button', {
      name: 'Save',
      exact: true
    }).click();
    const warning = this.page
      .getByText(/similar records exist|duplicate (?:record|lead|detected)|already exists/i)
      .filter({ visible: true })
      .first();
    await expect.poll(async () => {
      if (await warning.isVisible().catch(() => false)) {
        return 'warning';
      }
      if (!(await this.dialog.isVisible())) {
        return 'saved';
      }
      return 'waiting';
    }, { timeout: 15000 }).not.toBe('waiting');
    if (await warning.isVisible().catch(() => false)) {
      const cancel = this.dialog.getByRole('button', {
        name: 'Cancel',
        exact: true
      });
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click();
      }
      return { duplicateWarning: true };
    }
    const name = `${duplicateData.firstName} ${duplicateData.lastName}`;
    const recordLink = this.page.getByRole('link', {
      name,
      exact: true
    }).first();
    await expect(recordLink).toBeVisible({ timeout: 15000 });
    await recordLink.click();
    await expect(this.page).toHaveURL(/\/lightning\/r\/Lead\//);
    return {
      duplicateWarning: false,
      createdId: this.getRecordId()
    };
  }
  async updateStatus(status: string): Promise<void> {
    const actionsMenu = this.page.locator('lightning-button-menu[data-target-reveals*="sfdc:StandardButton.Lead.Edit"]');
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
    if (await detailsTab.count())
      await detailsTab.click();
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
    const statusValue = leadStatusField.locator('lightning-formatted-text[data-output-element-id="output-field"]');
    await expect(statusValue).toHaveText(status);
  }
  getRecordId(): string {
    const match = this.page.url().match(/\/lightning\/r\/Lead\/([a-zA-Z0-9]{15,18})(?:\/|\?|$)/);
    if (!match)
      throw new Error(`Lead record ID not found in URL: ${this.page.url()}`);
    return match[1];
  }
  private async choose(label: string, value: string): Promise<void> {
    const name = label === 'Status' ? /^(Lead )?Status$/i : label;
    const combobox = this.dialog.getByRole('combobox', { name, exact: true });
    const button = this.dialog.getByRole('button', { name, exact: true });
    const trigger = (await combobox.count()) ? combobox.first() : button.first();
    await expect(trigger).toBeVisible();
    if (await trigger.getAttribute('data-value') === value)
      return;
    await trigger.click();
    const option = this.page.getByRole('option', { name: value, exact: true });
    await expect(option).toBeVisible({ timeout: 10000 });
    try {
      await option.click({ timeout: 5000 });
    }
    catch (clickError) {
      if (await trigger.getAttribute('data-value') !== value) {
        if (await trigger.getAttribute('aria-expanded') !== 'true') {
          await trigger.click();
        }
        await expect(option).toBeVisible({ timeout: 8000 });
        const targetId = await option.getAttribute('id');
        if (!targetId)
          throw clickError;
        await trigger.focus();
        let selected = false;
        for (let i = 0; i < 30; i++) {
          if (await trigger.getAttribute('aria-activedescendant') === targetId) {
            await trigger.press('Enter');
            selected = true;
            break;
          }
          await trigger.press('ArrowDown');
        }
        if (!selected)
          throw clickError;
      }
    }
    if (await trigger.getAttribute('data-value') !== null) {
      await expect(trigger).toHaveAttribute('data-value', value);
    }
  }
}
