import { expect, test } from '@playwright/test';
import { environment } from '../../src/config/environment.js';
import { LoginPage } from '../../src/pages/login.page.js';

async function signIn(page: import('@playwright/test').Page, role: 'employee1' | 'finance') {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(environment.email(role), environment.seedPassword());
  await expect(page.getByTestId('user-menu')).toBeVisible();
}

test.describe('Exploratory UI charters', () => {
  test('EXPUI-01 @negative Finance policy page is read-only', async ({ page }) => {
    await signIn(page, 'finance');
    await page.goto('/policies');
    await expect(page.getByRole('heading', { name: 'Policy Engine' })).toBeVisible();
    await expect(page.getByRole('button', { name: /new rule/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /edit|delete|deactivate/i })).toHaveCount(0);
  });

  test('EXPUI-02 policy threshold communicates strictly less than 50', async ({ page }) => {
    await signIn(page, 'finance');
    await page.goto('/policies');
    const policy = page.getByText('Auto-approve under $50').locator('..').locator('..');
    await expect(policy).toContainText(/<\s*\$?50|less than \$?50/i);
    await expect(policy).not.toContainText(/≤\s*\$?50|at or below \$?50/i);
  });

  test('EXPUI-03 approval queue identifies the submitter', async ({ page }) => {
    await signIn(page, 'finance');
    await page.goto('/approvals');
    await expect(page.getByRole('heading', { name: 'Approval queue' })).toBeVisible();
    await expect(page.locator('main')).toContainText(/Elena Employee|Ethan Employee|employee\d@spendwise\.test/i);
  });

  test('EXPUI-04 final expenses do not expose delete actions', async ({ page }) => {
    await signIn(page, 'employee1');
    await page.goto('/expenses');
    const approvedExpense = page.getByText('EXP-2026-0004', { exact: true });
    await expect(approvedExpense).toBeVisible();
    const approvedContainer = approvedExpense.locator('xpath=ancestor::*[.//button[@title="Delete expense"]][1]');
    await expect(approvedContainer.getByTitle('Delete expense')).toHaveCount(0);
  });

  test('EXPUI-05 global search has an accessible name', async ({ page }) => {
    await signIn(page, 'employee1');
    const search = page.getByPlaceholder('Search expenses, vendors...');
    await expect(search).toBeVisible();
    await expect(search).toHaveAccessibleName(/search/i);
  });

  test('EXPUI-06 manual expense fields are associated with labels', async ({ page }) => {
    await signIn(page, 'employee1');
    await page.goto('/expenses/new');
    await page.getByRole('button', { name: /skip/i }).click();
    for (const label of ['Description', 'Vendor', 'Category', 'Amount', 'Date', 'Notes']) {
      await expect(page.getByLabel(new RegExp(label, 'i'))).toHaveCount(1);
    }
  });
});
