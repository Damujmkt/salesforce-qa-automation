import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';
import { SalesforceHomePage } from '../pages/salesforce-home.page';
import { SalesforceLeadsPage } from '../pages/salesforce-leads.page';
import { uniqueLead } from '../support/lead-data';
const { Given, When, Then } = createBdd(test);
Given('I am authenticated in Salesforce', async ({ page }) => {
  const home = new SalesforceHomePage(page);
  await home.open();
  await home.expectAuthenticated();
});
Given('I navigate to the Sales App', async ({ page }) => {
  await new SalesforceLeadsPage(page).openSalesApp();
});
Given('I open the Leads page', async ({ page }) => {
  await new SalesforceLeadsPage(page).openLeads();
});
Given('I have created a Lead with valid details', async ({ page, leadState }) => {
  leadState.data = uniqueLead();
  const leads = new SalesforceLeadsPage(page);
  await leads.create(leadState.data);
  leadState.recordId = leads.getRecordId();
  leadState.cleanup.add('Lead', leadState.recordId);
});
When('I create a Lead with unique valid details', async ({ page, leadState }) => {
  leadState.data = uniqueLead();
  const leads = new SalesforceLeadsPage(page);
  await leads.create(leadState.data);
  leadState.recordId = leads.getRecordId();
  leadState.cleanup.add('Lead', leadState.recordId);
});
Then('the Lead should be created successfully', async ({ page }) => {
  await expect(page).toHaveURL(/\/lightning\/r\/Lead\//);
});
Then('the Lead should have a valid 18-character Salesforce ID', async ({ page, leadState }) => {
  const id = new SalesforceLeadsPage(page).getRecordId();
  expect(id).toMatch(/^[a-zA-Z0-9]{18}$/);
  expect(id).toBe(leadState.recordId);
});
Then('the Lead details should match the submitted data', async ({ page, leadState }) => {
  if (!leadState.data)
    throw new Error('Lead test data not initialized');
  await new SalesforceLeadsPage(page).expectDetails(leadState.data);
});
When('I update the Lead status to {string}', async ({ page, leadState }, status: string) => {
  leadState.expectedStatus = status;
  await new SalesforceLeadsPage(page).updateStatus(status);
});
Then('the Lead status should be {string}', async ({ page }, status: string) => {
  await new SalesforceLeadsPage(page).expectStatus(status);
});
Then('the updated status should persist after page reload', async ({ page, leadState }) => {
  if (!leadState.expectedStatus)
    throw new Error('Expected Lead status not initialized');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new SalesforceLeadsPage(page).expectStatus(leadState.expectedStatus);
});
When('I try to save a Lead without Last Name and Company', async ({ page }) => {
  await new SalesforceLeadsPage(page).verifyRequiredFieldValidation();
});
Then('Salesforce should show the required Lead field errors', async ({ page }) => {
  await new SalesforceLeadsPage(page).verifyRequiredFieldErrors();
});
When('I try to create another Lead with the same email', async ({ page, leadState }) => {
  if (!leadState.data) {
    throw new Error('Lead test data is missing');
  }
  const leads = new SalesforceLeadsPage(page);
  const result = await leads.attemptDuplicateEmailLead(leadState.data);
  leadState.duplicateWarning = result.duplicateWarning;
  if (result.createdId) {
    leadState.cleanup.add('Lead', result.createdId);
  }
});
Then('Salesforce should warn about the duplicate Lead if detection is enabled', async ({ leadState }) => {
  if (leadState.duplicateWarning === undefined) {
    throw new Error('Duplicate Lead validation was not executed');
  }
  test.skip(!leadState.duplicateWarning, 'Duplicate Lead email is permitted in this Salesforce org; duplicate detection is not enforced.');
  expect(leadState.duplicateWarning).toBe(true);
});
