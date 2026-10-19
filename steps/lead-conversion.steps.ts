import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { SalesforceLeadConversionPage } from '../pages/salesforce-lead-conversion.page';
import { SalesforceOpportunityPage } from '../pages/salesforce-opportunity.page';
const { When, Then } = createBdd(test);
When('I open the Lead conversion modal', async ({ page }) => {
    const conversionPage = new SalesforceLeadConversionPage(page);
    await conversionPage.openConversionModal();
});
When('I choose to create a new Account, Contact and Opportunity', async ({ page }) => {
    const conversionPage = new SalesforceLeadConversionPage(page);
    await conversionPage.chooseNewRecords();
});
When('I enter a unique Opportunity name', async ({ page, leadState }) => {
    if (!leadState.data) {
        throw new Error('Lead data is not initialized');
    }
    const opportunityName = `Opportunity-${leadState.data.lastName}-${Date.now()}`;
    leadState.opportunityName = opportunityName;
    const conversionPage = new SalesforceLeadConversionPage(page);
    await conversionPage.enterOpportunityName(opportunityName);
});
When('I convert the Lead', async ({ page, leadState }) => {
    const conversionPage = new SalesforceLeadConversionPage(page);
    const ids = await conversionPage.convert();
    leadState.convertedIds = ids;
    leadState.cleanup.add('Opportunity', ids.opportunityId);
    if (!leadState.existingAccountId)
        leadState.cleanup.add('Account', ids.accountId);
    if (!leadState.existingContactId)
        leadState.cleanup.add('Contact', ids.contactId);
    if (leadState.recordId)
        leadState.cleanup.markLeadConverted(leadState.recordId);
});
Then('the Lead conversion should succeed', async ({ page }) => {
    await expect(page.getByText(/Your lead has been converted/i)).toBeVisible();
});
When('I navigate to the converted Opportunity', async ({ page, leadState }) => {
    const opportunityId = leadState.convertedIds?.opportunityId;
    if (!opportunityId) {
        throw new Error('Opportunity ID is missing from the conversion response');
    }
    const opportunity = new SalesforceOpportunityPage(page);
    await opportunity.openById(opportunityId);
    if (leadState.opportunityName) {
        await opportunity.verifyOpportunity(leadState.opportunityName);
    }
});
Then('the new Opportunity should be displayed', async ({ page, leadState }) => {
    if (!leadState.opportunityName) {
        throw new Error('Opportunity name not initialized');
    }
    await new SalesforceOpportunityPage(page)
        .verifyOpportunity(leadState.opportunityName);
});
Then('the Opportunity should reference the new Account', async ({ page, leadState }) => {
    if (!leadState.data) {
        throw new Error('Lead data not initialized');
    }
    await new SalesforceOpportunityPage(page)
        .verifyAccount(leadState.data.company);
});
Then('the converted Contact should belong to the Opportunity Account', async ({ page, leadState }) => {
    if (!leadState.data || !leadState.convertedIds) {
        throw new Error('Converted Contact/Account data is missing');
    }
    const { accountId, contactId } = leadState.convertedIds;
    const contactName = `${leadState.data.firstName} ${leadState.data.lastName}`;
    await new SalesforceOpportunityPage(page).verifyConvertedContactAccount(contactId, accountId, contactName);
});
Then('the Opportunity Owner should be populated', async ({ page }) => {
    await new SalesforceOpportunityPage(page)
        .verifyOwner();
});
Then('the Opportunity Stage should be {string}', async ({ page }, stage: string) => {
    await new SalesforceOpportunityPage(page)
        .verifyStage(stage);
});
