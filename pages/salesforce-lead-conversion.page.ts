import { expect, test, type Page } from '@playwright/test';
import { chooseLookupSuggestion } from '../support/salesforce-records';
export type ConvertedRecordIds = {
    accountId: string;
    contactId: string;
    opportunityId: string;
};
export class SalesforceLeadConversionPage {
    constructor(private readonly page: Page) { }
    async openConversionModal(): Promise<void> {
        await expect(this.page).toHaveURL(/\/lightning\/r\/Lead\/[A-Za-z0-9]{15,18}/);
        const actionsMenu = this.page.locator('lightning-button-menu[data-target-reveals*="sfdc:StandardButton.Lead.Convert"]');
        const actionsButton = actionsMenu.getByRole('button', {
            name: 'Show more actions'
        });
        await expect(actionsButton).toBeVisible({ timeout: 30000 });
        await actionsButton.click();
        await actionsMenu.getByRole('menuitem', {
            name: 'Convert',
            exact: true
        }).click();
        await expect(this.page.getByText('Create New Account', { exact: true })).toBeVisible();
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
    async chooseNewContact(): Promise<void> {
        await this.selectNewRadio('Create New Contact');
    }
    async chooseNewOpportunity(): Promise<void> {
        await this.selectNewRadio('Create New Opportunity');
    }
    private async selectExisting(kind: 'Account' | 'Contact', name: string): Promise<void> {
        await this.selectNewRadio(`Choose Existing ${kind}`);
        const plural = kind === 'Account' ? 'accounts' : 'contacts';
        const input = this.page.getByPlaceholder(new RegExp(`Search for matching ${plural}`, 'i')).or(this.page.getByRole('textbox', {
            name: new RegExp(`${kind} Search`, 'i')
        })).first();
        await expect(input, `Expected ${kind} existing-record lookup`).toBeVisible();
        await input.fill(name);
        await chooseLookupSuggestion(this.page, name);
        const pill = this.page.locator('.uiPillContainer .assistiveText')
            .filter({ hasText: new RegExp(`${kind} Search - Current Selection:`, 'i') });
        await expect(pill).toContainText(name);
    }
    async chooseExistingAccount(name: string): Promise<void> {
        await this.selectExisting('Account', name);
    }
    async chooseExistingContact(name: string): Promise<void> {
        await this.selectExisting('Contact', name);
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
            await opportunityPanel.locator('.createPanelCollapsed button').click();
        }
        await expect(nameInput).toBeVisible();
        await nameInput.fill(name);
    }
    async convert(): Promise<ConvertedRecordIds> {
        return test.step('API bonus: capture and validate Salesforce Lead conversion response', async () => {
            const responsePromise = this.page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/aura') &&
                response.request().method() === 'POST' &&
                (response.request().postData() ?? '').includes('convertLeadServer'), { timeout: 45000 });
            await this.page.getByRole('button', {
                name: 'Convert',
                exact: true
            }).click();
            const response = await responsePromise;
            expect(response.ok(), 'Salesforce conversion HTTP response').toBeTruthy();
            const body: unknown = await response.json();
            const actions = (body as {
                actions?: Array<{
                    state?: string;
                    returnValue?: {
                        accountId?: unknown;
                        contactId?: unknown;
                        opportunityId?: unknown;
                        hasError?: unknown;
                        isPersonAccount?: unknown;
                    };
                }>;
            }).actions;
            expect(Array.isArray(actions), 'Aura response contains actions').toBe(true);
            const conversion = actions?.find(action => action.returnValue &&
                typeof action.returnValue === 'object' &&
                'opportunityId' in action.returnValue);
            expect(conversion, 'Aura conversion action is present').toBeDefined();
            expect(conversion?.state).toBe('SUCCESS');
            expect(conversion?.returnValue?.hasError).toBe(false);
            expect(conversion?.returnValue?.isPersonAccount).toBe(false);
            const accountId = conversion?.returnValue?.accountId;
            const contactId = conversion?.returnValue?.contactId;
            const opportunityId = conversion?.returnValue?.opportunityId;
            expect(accountId, 'Valid Account record ID').toMatch(/^001[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/);
            expect(contactId, 'Valid Contact record ID').toMatch(/^003[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/);
            expect(opportunityId, 'Valid Opportunity record ID').toMatch(/^006[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/);
            await test.info().attach('salesforce-conversion-api.json', {
                body: JSON.stringify({
                    endpoint: 'POST /aura',
                    action: 'convertLeadServer',
                    httpStatus: response.status(),
                    state: conversion?.state,
                    returnValue: {
                        accountId,
                        contactId,
                        opportunityId,
                        hasError: conversion?.returnValue?.hasError,
                        isPersonAccount: conversion?.returnValue?.isPersonAccount
                    }
                }, null, 2),
                contentType: 'application/json'
            });
            await expect(this.page.getByText(/Your lead has been converted/i)).toBeVisible();
            return {
                accountId: accountId as string,
                contactId: contactId as string,
                opportunityId: opportunityId as string
            };
        });
    }
}
