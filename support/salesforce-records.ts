import { expect, type Locator, type Page } from '@playwright/test';
export type SalesforceRecordType = 'Account' | 'Contact' | 'Opportunity' | 'Lead';
export function recordIdFromUrl(url: string, type: SalesforceRecordType): string {
  const match = url.match(new RegExp(`/lightning/r/${type}/([A-Za-z0-9]{15,18})(?:/|\\?|$)`));
  if (!match)
    throw new Error(`No ${type} record ID in URL: ${url}`);
  return match[1];
}
export function expectSameSalesforceId(actual: string, expected: string): void {
  expect(actual.slice(0, 15)).toBe(expected.slice(0, 15));
}
export async function openObjectList(page: Page, type: 'Account' | 'Contact'): Promise<void> {
  await page.goto(new URL(`/lightning/o/${type}/list`, page.url()).toString(), {
    waitUntil: 'domcontentloaded'
  });
  await expect(page.getByRole('button', { name: 'New', exact: true }).first()).toBeVisible();
}
export function activeRecordDialog(page: Page): Locator {
  return page.locator('[role="dialog"][aria-modal="true"]:visible');
}
export async function locateCreatedRecord(page: Page, type: SalesforceRecordType, name: string): Promise<string> {
  const matcher = new RegExp(`/lightning/r/${type}/[A-Za-z0-9]{15,18}`);
  if (!matcher.test(page.url())) {
    const recordLink = page.getByRole('link', { name, exact: true }).filter({ visible: true });
    await expect(recordLink.first(), `Expected a saved ${type} link for ${name}`).toBeVisible();
    await recordLink.first().click();
  }
  await expect(page).toHaveURL(matcher);
  return recordIdFromUrl(page.url(), type);
}
export async function chooseLookupSuggestion(page: Page, name: string): Promise<void> {
  const options = page.locator('[role="listbox"]:visible [role="option"]:visible');
  const suggestion = options.filter({
    has: page.getByText(name, { exact: true })
  });
  try {
    await expect(suggestion, `Expected one lookup result for "${name}"`).toHaveCount(1, { timeout: 15000 });
  }
  catch (error) {
    const visibleOptions = await options.allTextContents();
    console.log('Requested record:', name);
    console.log('Visible lookup options:', visibleOptions);
    throw error;
  }
  await expect(suggestion).toBeVisible();
  await suggestion.click();
}
