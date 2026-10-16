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
});

When('I create a Lead with unique valid details', async ({ page, leadState }) => {
  leadState.data = uniqueLead();
  const leads = new SalesforceLeadsPage(page);
  await leads.create(leadState.data);
  leadState.recordId = leads.getRecordId();
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
  if (!leadState.data) throw new Error('Lead test data not initialized');
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
  if (!leadState.expectedStatus) throw new Error('Expected Lead status not initialized');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new SalesforceLeadsPage(page).expectStatus(leadState.expectedStatus);
});
