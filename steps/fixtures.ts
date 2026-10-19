import { test as base } from 'playwright-bdd';
import type { LeadData } from '../support/lead-data';
import { CleanupRegistry } from '../support/salesforce-cleanup';
import type { ConvertedRecordIds } from '../pages/salesforce-lead-conversion.page';
export type LeadState = {
  data?: LeadData;
  recordId?: string;
  expectedStatus?: string;
  opportunityName?: string;
  existingAccountId?: string;
  existingContactId?: string;
  convertedIds?: ConvertedRecordIds;
  duplicateWarning?: boolean;
  cleanup: CleanupRegistry;
};
export const test = base.extend<{
  leadState: LeadState;
}>({
  leadState: async ({ page }, use, testInfo) => {
    const state: LeadState = {
      cleanup: new CleanupRegistry()
    };
    await use(state);
    if (process.env.SF_CLEANUP === '0')
      return;
    testInfo.setTimeout(testInfo.timeout + 90000);
    await state.cleanup.cleanup(page);
  }
});
