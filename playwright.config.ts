import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import 'dotenv/config';

const bddTestDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'steps/**/*.ts',
  outputDir: '.features-gen'
});

export default defineConfig({
  testDir: bddTestDir,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]],
  use: {
    baseURL: process.env.SF_ORG_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'setup-chromium',
      testDir: './tests/setup',
      testMatch: 'chromium.setup.ts',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'setup-webkit',
      testDir: './tests/setup',
      testMatch: 'webkit.setup.ts',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'chromium',
      testDir: bddTestDir,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/chromium.json'
      },
      dependencies: ['setup-chromium']
    },
    {
      name: 'webkit',
      testDir: bddTestDir,
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/webkit.json'
      },
      dependencies: ['setup-webkit']
    }
  ]
});
