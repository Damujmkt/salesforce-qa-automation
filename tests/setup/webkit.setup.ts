import { test } from '@playwright/test';
import { ensureAuthenticated } from '../../auth/salesforce.auth';
test('prepare WebKit Salesforce authentication', async () => {
  test.setTimeout(180000);
  await ensureAuthenticated('webkit');
});
