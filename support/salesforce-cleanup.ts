import { expect, type Page } from '@playwright/test';
export type CleanupType = 'Lead' | 'Account' | 'Contact' | 'Opportunity';
export type CleanupRecord = {
  type: CleanupType;
  id: string;
};
const prefixes: Record<CleanupType, string> = {
  Lead: '00Q', Account: '001', Contact: '003', Opportunity: '006'
};
export class CleanupRegistry {
  private readonly records = new Map<string, CleanupRecord>();
  private readonly convertedLeads = new Set<string>();
  add(type: CleanupType, id: string): void {
    if (!new RegExp(`^${prefixes[type]}[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$`).test(id)) {
      throw new Error(`Invalid Salesforce ${type} ID: ${id}`);
    }
    this.records.set(`${type}:${id.slice(0, 15)}`, { type, id });
  }
  markLeadConverted(id: string): void {
    this.convertedLeads.add(id.slice(0, 15));
  }
  async cleanup(page: Page): Promise<void> {
    const order: CleanupType[] = ['Opportunity', 'Contact', 'Account', 'Lead'];
    const records = [...this.records.values()].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
    for (const record of records) {
      if (record.type === 'Lead' && this.convertedLeads.has(record.id.slice(0, 15))) {
        console.log(`[cleanup] Skipped converted Lead ${record.id}`);
        continue;
      }
      try {
        await deleteRecord(page, record);
        console.log(`[cleanup] Deleted ${record.type} ${record.id}`);
      }
      catch (error) {
        console.warn(`[cleanup] Failed ${record.type} ${record.id}: ${String(error)}`);
      }
    }
  }
}
async function deleteRecord(page: Page, { type, id }: CleanupRecord): Promise<void> {
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/lightning/r/${type}/${id}/view`, {
    waitUntil: 'domcontentloaded', timeout: 20000
  });
  const directDelete = page.getByRole('button', { name: 'Delete', exact: true });
  if (await directDelete.first().isVisible().catch(() => false)) {
    await directDelete.first().click({ timeout: 10000 });
  }
  else {
    const actionMenu = page.locator(`lightning-button-menu[data-target-reveals*="sfdc:StandardButton.${type}.Delete"]`);
    const menuButton = actionMenu.getByRole('button', { name: 'Show more actions' });
    if (await menuButton.count()) {
      await menuButton.click({ timeout: 12000 });
    }
    else {
      await page.getByRole('button', { name: 'Show more actions' })
        .first().click({ timeout: 12000 });
    }
    await page.getByRole('menuitem', { name: 'Delete', exact: true })
      .click({ timeout: 10000 });
  }
  const confirm = page.locator('[role="dialog"][aria-modal="true"]:visible')
    .filter({ has: page.getByRole('button', { name: 'Delete', exact: true }) });
  await expect(confirm).toHaveCount(1, { timeout: 10000 });
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(confirm).toBeHidden({ timeout: 12000 });
}
