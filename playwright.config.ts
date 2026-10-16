import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  outputDir: 'test-results/artifacts',
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'contract', testDir: './tests/contract' },
    { name: 'api', testDir: './tests/api' },
    { name: 'integration', testDir: './tests/integration', workers: 1 },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.SPENDWISE_WEB_URL,
        httpCredentials: process.env.SPENDWISE_PROXY_USER && process.env.SPENDWISE_PROXY_PASSWORD
          ? { username: process.env.SPENDWISE_PROXY_USER, password: process.env.SPENDWISE_PROXY_PASSWORD }
          : undefined,
      },
      workers: 1,
    }
  ],
});
