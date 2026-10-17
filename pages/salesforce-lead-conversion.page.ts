
import { expect, type Page } from '@playwright/test';

export class SalesforceLeadConversionPage {
    constructor(private readonly page: Page) { }

    async openConversionModal(): Promise<void> {
        const actionsMenu = this.page.locator(
            'lightning-button-menu[data-target-reveals*="sfdc:StandardButton.Lead.Convert"]'
        );

        await actionsMenu.getByRole('button', {
            name: 'Show more actions'
        }).click();

        await actionsMenu.getByRole('menuitem', {
            name: 'Convert',
            exact: true
        }).click();

        await expect(
            this.page.getByText('Create New Account', { exact: true })
        ).toBeVisible();
    }

    private async selectNewRadio(label: string): Promise<void> {
        const radioLabel = this.page
            .locator('label.slds-radio__label')
            .filter({ hasText: label });

        await expect(radioLabel).toBeVisible();
        await radioLabel.click();
    }

    async chooseNewRecords(): Promise<void> {
        await this.selectNewRadio('Create New Account');
        await this.selectNewRadio('Create New Contact');
        await this.selectNewRadio('Create New Opportunity');
    }

    async enterOpportunityName(name: string): Promise<void> {
        const opportunityPanel = this.page.locator('.createPanel').filter({
            has: this.page.getByText('Create New Opportunity', {
                exact: true
            })
        });

        const nameInput = opportunityPanel.getByRole('textbox', {
            name: /Opportunity Name/
        });

        if (!(await nameInput.isVisible())) {
            await opportunityPanel.locator(
                '.createPanelCollapsed button'
            ).click();
        }

        await expect(nameInput).toBeVisible();
        await nameInput.fill(name);
    }

    async convert(): Promise<void> {
        await this.page.getByRole('button', {
            name: 'Convert',
            exact: true
        }).click();

        await expect(
            this.page.getByText(/Your lead has been converted/i)
        ).toBeVisible();
    }
}
