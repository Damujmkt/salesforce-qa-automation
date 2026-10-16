import { test } from '@playwright/test';
import { ensureAuthenticated } from '../../auth/salesforce.auth';

test('prepare Chromium Salesforce authentication', async () => {
  test.setTimeout(180_000);
  await ensureAuthenticated('chromium');
});
