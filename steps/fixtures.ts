import { test as base } from 'playwright-bdd';
import type { LeadData } from '../support/lead-data';

type LeadState = { data?: LeadData; recordId?: string; expectedStatus?: string; opportunityName?: string; };

export const test = base.extend<{ leadState: LeadState }>({
  leadState: async ({ }, use) => { await use({}); }
});
