import { test, createBdd } from 'playwright-bdd';
import { SalesforceHomePage } from '../pages/salesforce-home.page';

const { Given, Then } = createBdd(test);

Given('I open my Salesforce Developer org', async ({ page }) => {
  await new SalesforceHomePage(page).open();
});

Then('the Salesforce Lightning application is authenticated', async ({ page }) => {
  await new SalesforceHomePage(page).expectAuthenticated();
});
