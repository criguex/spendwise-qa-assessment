import { expect, test } from '@playwright/test';
import { environment, TestRole } from '../../src/config/environment.js';
import { LoginPage } from '../../src/pages/login.page.js';
import { readFile } from 'node:fs/promises';

const allowed = [
  { id: 'E2E-M01', role: 'employee1', path: '/expenses', heading: 'My Expenses' },
  { id: 'E2E-M02', role: 'employee1', path: '/expenses/new', heading: 'New expense' },
  { id: 'E2E-M03', role: 'employee1', path: '/reports', heading: 'Expense Reports' },
  { id: 'E2E-M04', role: 'manager1', path: '/approvals', heading: 'Approval queue' },
  { id: 'E2E-M05', role: 'finance', path: '/approvals', heading: 'Approval queue' },
  { id: 'E2E-M06', role: 'finance', path: '/policies', heading: 'Policy Engine' },
  { id: 'E2E-M07', role: 'admin', path: '/policies', heading: 'Policy Engine' },
  { id: 'E2E-M08', role: 'admin', path: '/reports', heading: 'Expense Reports' },
] as const;

for (const scenario of allowed) {
  test(`${scenario.id} ${scenario.role} opens ${scenario.path}`, async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(environment.email(scenario.role as TestRole), environment.seedPassword());
    await expect(page.getByTestId('user-menu')).toBeVisible();
    await page.goto(scenario.path);
    await expect(page.getByRole('heading', { name: scenario.heading })).toBeVisible();
  });
}

test('E2E-M09 @negative Administrator direct access to New expense is denied', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(environment.email('admin'), environment.seedPassword());
  await expect(page.getByTestId('user-menu')).toBeVisible();
  await page.goto('/expenses/new');
  await expect(page.getByTestId('access-denied')).toBeVisible();
});

test('E2E-M10 Reports exposes a working export control', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(environment.email('employee1'), environment.seedPassword());
  await expect(page.getByTestId('user-menu')).toBeVisible();
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Expense Reports' })).toBeVisible();
  await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
});

test('E2E-M11 Reports exports a non-empty CSV file', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(environment.email('employee1'), environment.seedPassword());
  await expect(page.getByTestId('user-menu')).toBeVisible();
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Expense Reports' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export csv/i }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  expect(path).not.toBeNull();
  const csv = await readFile(path!, 'utf8');
  expect(csv.trim().split(/\r?\n/).length).toBeGreaterThan(1);
  expect(csv).toMatch(/expense|amount|status/i);
});

test('E2E-M12 @negative CSV neutralizes spreadsheet formula prefixes', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(environment.email('employee3'), environment.seedPassword());
  await expect(page.getByTestId('user-menu')).toBeVisible();
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Expense Reports' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export csv/i }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const csv = await readFile(path!, 'utf8');
  expect(csv).not.toMatch(/(?:^|,)"?[=+@]/m);
});
