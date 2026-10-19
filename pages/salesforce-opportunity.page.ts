import { expect, type Locator, type Page } from '@playwright/test';
import { expectSameSalesforceId, recordIdFromUrl } from '../support/salesforce-records';
export class SalesforceOpportunityPage {
    constructor(private readonly page: Page) { }
    async openById(opportunityId: string): Promise<void> {
        if (!/^006[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/.test(opportunityId)) {
            throw new Error(`Invalid Opportunity ID: ${opportunityId}`);
        }
        const url = new URL(`/lightning/r/Opportunity/${opportunityId}/view`, this.page.url());
        await this.page.goto(url.toString(), {
            waitUntil: 'domcontentloaded'
        });
        await expect(this.page).toHaveURL(/\/lightning\/r\/Opportunity\/[A-Za-z0-9]{15,18}\/view/);
        await expect(this.page.getByRole('tab', {
            name: 'Details',
            exact: true
        })).toBeVisible({ timeout: 30000 });
        console.log(`Opportunity page ready: ${opportunityId}`);
    }
    async verifyOpportunity(name: string): Promise<void> {
        await expect(this.page).toHaveURL(/\/lightning\/r\/Opportunity\/[a-zA-Z0-9]{15,18}/);
        await expect(this.page.getByText(name, { exact: true })
            .filter({ visible: true })
            .first()).toBeVisible();
    }
    private field(label: string): Locator {
        return this.page
            .getByRole('tabpanel', { name: 'Details' })
            .getByRole('listitem')
            .filter({
                has: this.page.getByText(label, {
                    exact: true
                })
            });
    }
    async verifyAccount(accountName: string): Promise<void> {
        await this.openDetails();
        const accountField = this.field('Account Name');
        await expect(accountField).toContainText(accountName);
        await expect(accountField.getByRole('link', {
            name: accountName,
            exact: true
        })).toBeVisible();
    }
    async verifyOwner(): Promise<void> {
        await this.openDetails();
        const ownerLink = this.field('Opportunity Owner').getByRole('link').first();
        await expect(ownerLink).toBeVisible();
        await expect(ownerLink).toHaveAttribute('href', /\/lightning\/r\/User\/005[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?\/view/);
    }
    async verifyStage(stage: string): Promise<void> {
        await this.openDetails();
        const stageField = this.field('Stage');
        await expect(stageField).toContainText(stage);
    }
    async verifyAccountId(expectedId: string): Promise<void> {
        await this.openDetails();
        const accountLink = this.field('Account Name')
            .getByRole('link')
            .first();
        await expect(accountLink).toBeVisible();
        const href = await accountLink.getAttribute('href');
        if (!href) {
            throw new Error('Opportunity Account link missing');
        }
        const actualId = recordIdFromUrl(new URL(href, this.page.url()).toString(), 'Account');
        expectSameSalesforceId(actualId, expectedId);
    }
    async verifyConvertedContactAccount(contactId: string, expectedAccountId: string, expectedContactName: string): Promise<void> {
        const opportunityUrl = this.page.url();
        const origin = new URL(opportunityUrl).origin;
        const contactUrl = new URL(`/lightning/r/Contact/${contactId}/view`, origin).toString();
        try {
            await this.page.goto(contactUrl, { waitUntil: 'domcontentloaded' });
            await expect(this.page).toHaveURL(/\/lightning\/r\/Contact\/[A-Za-z0-9]{15,18}/);
            await expect(this.page.getByText(expectedContactName, { exact: true })
                .filter({ visible: true }).first()).toBeVisible();
            await this.openDetails();
            const parentAccount = this.field('Account Name').getByRole('link').first();
            const accountId = expectedAccountId.slice(0, 15);
            await expect(parentAccount).toHaveAttribute(
                'href',
                new RegExp(
                    `/lightning/r/Account/${accountId}(?:[A-Za-z0-9]{3})?/view`
                ),
                { timeout: 20_000 }
            );
        }
        finally {
            await this.page.goto(opportunityUrl, { waitUntil: 'domcontentloaded' });
        }
    }
    private async openDetails(): Promise<void> {
        const detailsTab = this.page.getByRole('tab', {
            name: 'Details',
            exact: true
        });
        await expect(detailsTab).toBeVisible();
        if ((await detailsTab.getAttribute('aria-selected')) !== 'true') {
            await detailsTab.click();
        }
        await expect(this.page.getByRole('tabpanel', {
            name: 'Details'
        })).toBeVisible();
    }
}
