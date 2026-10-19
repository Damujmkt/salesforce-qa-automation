import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { SalesforceAccountsPage } from '../pages/salesforce-accounts.page';
import { SalesforceContactsPage } from '../pages/salesforce-contacts.page';
import { SalesforceLeadConversionPage } from '../pages/salesforce-lead-conversion.page';
import { SalesforceOpportunityPage } from '../pages/salesforce-opportunity.page';
import { uniqueLead } from '../support/lead-data';
import { SalesforceLeadsPage } from '../pages/salesforce-leads.page';
const { Given, When, Then } = createBdd(test);
Given('an existing Account matches the Lead company', async ({ page, leadState }) => {
  if (!leadState.data) {
    throw new Error('Conversion data not initialized');
  }
  if (leadState.existingAccountId) {
    throw new Error('Account already created for this scenario');
  }
  const accounts = new SalesforceAccountsPage(page);
  leadState.existingAccountId =
    await accounts.create(leadState.data.company);
  leadState.cleanup.add('Account', leadState.existingAccountId);
});
Given('an existing Contact matches the Lead under that Account', async ({ page, leadState }) => {
  if (!leadState.data) {
    throw new Error('Prepare conversion test data first');
  }
  if (!leadState.existingAccountId) {
    throw new Error('Create the existing Account before Contact');
  }
  const contacts = new SalesforceContactsPage(page);
  leadState.existingContactId = await contacts.create(leadState.data, leadState.data.company);
  leadState.cleanup.add('Contact', leadState.existingContactId);
});
When('I select the existing Account for conversion', async ({ page, leadState }) => {
  if (!leadState.existingAccountId || !leadState.data)
    throw new Error('Existing Account not prepared');
  await new SalesforceLeadConversionPage(page).chooseExistingAccount(leadState.data.company);
});
When('I select the Account associated with the existing Contact', async ({ page, leadState }) => {
  if (!leadState.existingAccountId || !leadState.existingContactId || !leadState.data) {
    throw new Error('Existing Account/Contact not prepared');
  }
  await new SalesforceLeadConversionPage(page).chooseExistingAccount(leadState.data.company);
});
When('I select the existing Contact for conversion', async ({ page, leadState }) => {
  if (!leadState.existingContactId || !leadState.data)
    throw new Error('Existing Contact not prepared');
  const fullName = `${leadState.data.firstName} ${leadState.data.lastName}`;
  await new SalesforceLeadConversionPage(page).chooseExistingContact(fullName);
});
When('I choose to create a new Contact', async ({ page }) => {
  await new SalesforceLeadConversionPage(page).chooseNewContact();
});
When('I choose to create a new Opportunity', async ({ page }) => {
  await new SalesforceLeadConversionPage(page).chooseNewOpportunity();
});
Then('the converted Account ID should match the existing Account ID', async ({ page, leadState }) => {
  if (!leadState.existingAccountId || !leadState.opportunityName)
    throw new Error('Expected Account/Opportunity missing');
  const opportunity = new SalesforceOpportunityPage(page);
  const opportunityId = leadState.convertedIds?.opportunityId;
  if (!opportunityId) {
    throw new Error('Converted Opportunity ID is missing');
  }
  await opportunity.openById(opportunityId);
  await opportunity.verifyAccountId(leadState.existingAccountId);
});
Then('the converted Contact ID should match the existing Contact ID', async ({ leadState }) => {
  if (!leadState.existingContactId || !leadState.convertedIds) {
    throw new Error('Existing and converted Contact IDs missing');
  }
  expect(leadState.convertedIds.contactId.slice(0, 15))
    .toBe(leadState.existingContactId.slice(0, 15));
});
Then('a new Contact should be associated with that Account', async ({ page, leadState }) => {
  if (!leadState.data || !leadState.existingAccountId || !leadState.convertedIds) {
    throw new Error('Expected conversion Contact/Account IDs missing');
  }
  expect(leadState.convertedIds.accountId.slice(0, 15))
    .toBe(leadState.existingAccountId.slice(0, 15));
  await new SalesforceOpportunityPage(page).verifyConvertedContactAccount(leadState.convertedIds.contactId, leadState.existingAccountId, `${leadState.data.firstName} ${leadState.data.lastName}`);
});
Then('the new Opportunity should reference the expected Account', async ({ page, leadState }) => {
  if (!leadState.data || !leadState.existingAccountId)
    throw new Error('Expected Account missing');
  const opportunity = new SalesforceOpportunityPage(page);
  await opportunity.verifyAccount(leadState.data.company);
  await opportunity.verifyAccountId(leadState.existingAccountId);
});
Then('the Opportunity should reference the expected Account', async ({ page, leadState }) => {
  if (!leadState.data || !leadState.existingAccountId)
    throw new Error('Expected Account missing');
  const opportunity = new SalesforceOpportunityPage(page);
  await opportunity.verifyAccount(leadState.data.company);
  await opportunity.verifyAccountId(leadState.existingAccountId);
});
Then('the Opportunity should contain the expected Contact', async ({ page, leadState }) => {
  if (!leadState.data || !leadState.existingContactId || !leadState.existingAccountId || !leadState.convertedIds) {
    throw new Error('Expected Contact/Account conversion records missing');
  }
  expect(leadState.convertedIds.contactId.slice(0, 15))
    .toBe(leadState.existingContactId.slice(0, 15));
  await new SalesforceOpportunityPage(page).verifyConvertedContactAccount(leadState.convertedIds.contactId, leadState.existingAccountId, `${leadState.data.firstName} ${leadState.data.lastName}`);
});
Given('I prepare unique conversion data', async ({ leadState }) => {
  leadState.data = uniqueLead();
});
Given('I create the matching Lead for conversion', async ({ page, leadState }) => {
  if (!leadState.data) {
    throw new Error('Lead data not initialized');
  }
  await page.goto(new URL('/lightning/o/Lead/list', page.url()).toString());
  const leads = new SalesforceLeadsPage(page);
  await leads.create(leadState.data);
  leadState.recordId = leads.getRecordId();
  leadState.cleanup.add('Lead', leadState.recordId);
});
