
import { expect, type Locator, type Page } from '@playwright/test';

export class SalesforceOpportunityPage {
    constructor(private readonly page: Page) { }
    async openByName(opportunityName: string): Promise<void> {
        const goToLeads = this.page.getByRole('button', {
            name: 'Go to Leads',
            exact: true
        });
        if (await goToLeads.isVisible()) {
            await goToLeads.click();
        }
        await this.page.getByRole('link', {
            name: 'Opportunities',
            exact: true
        }).first().click();
        const recordLink = this.page.getByRole('link', {
            name: opportunityName,
            exact: true
        });
        if (await recordLink.count() === 0) {
            const search = this.page.getByRole('searchbox', {
                name: /Search this list/i
            });

            await expect(search).toBeVisible();
            await search.fill(opportunityName);
            await search.press('Enter');
        }
        await expect(recordLink.first()).toBeVisible();
        await recordLink.first().click();
        await expect(this.page).toHaveURL(
            /\/lightning\/r\/Opportunity\/[a-zA-Z0-9]{15,18}/
        );
    }

    async verifyOpportunity(name: string): Promise<void> {
        await expect(this.page).toHaveURL(
            /\/lightning\/r\/Opportunity\/[a-zA-Z0-9]{15,18}/
        );
        await expect(
            this.page.getByText(name, { exact: true })
                .filter({ visible: true })
                .first()
        ).toBeVisible();
    }

    private field(label: string): Locator {
        return this.page
            .locator('.test-id__output-root')
            .filter({
                has: this.page.locator('.test-id__field-label', {
                    hasText: new RegExp(`^${label}$`)
                })
            });
    }

    async verifyAccount(accountName: string): Promise<void> {
        await this.openDetails();
        const accountField = this.field('Account Name');
        await expect(accountField).toContainText(accountName);
        await expect(
            accountField.getByRole('link', {
                name: accountName,
                exact: true
            })
        ).toBeVisible();
    }

    async verifyContact(contactName: string): Promise<void> {
        await this.page.getByRole('tab', {
            name: 'Related',
            exact: true
        }).click();
        await expect(
            this.page.getByText(/Contact Roles/i)
                .filter({ visible: true })
                .first()
        ).toBeVisible();
        await expect(
            this.page.getByRole('link', {
                name: contactName,
                exact: true
            }).first()
        ).toBeVisible();
    }

    async verifyOwner(): Promise<void> {
        await this.openDetails();
        const ownerField = this.field('Opportunity Owner');
        await expect(ownerField).toBeVisible();
        const owner = await ownerField
            .locator('.test-id__field-value')
            .innerText();
        expect(owner.trim()).not.toBe('');
    }

    async verifyStage(stage: string): Promise<void> {
        await this.openDetails();
        const stageField = this.field('Stage');
        await expect(stageField).toContainText(stage);
    }

    private async openDetails(): Promise<void> {
        const detailsTab = this.page.getByRole('tab', {
            name: 'Details',
            exact: true
        });
        await detailsTab.click();
    }
}
