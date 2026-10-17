import { expect, test } from '@playwright/test';
import { environment } from '../../src/config/environment.js';
import { LoginPage } from '../../src/pages/login.page.js';

async function signIn(page: import('@playwright/test').Page) {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(environment.email('employee1'), environment.seedPassword());
  await expect(page.getByTestId('user-menu')).toBeVisible();
}

test.describe('Functional UI recovery', () => {
  test('UI-02 failed expense submission shows a message and preserves entered values', async ({ page }) => {
    await signIn(page);
    await page.goto('/expenses/new');
    await page.getByRole('button', { name: /skip/i }).click();

    const form = {
      description: `ui-recovery-${Date.now()}`,
      vendor: 'QA Sample Vendor',
      amount: '12.34',
      date: '2026-10-15',
    };
    await page.getByLabel('Description').fill(form.description);
    await page.getByLabel('Vendor').fill(form.vendor);
    await page.getByLabel('Category').selectOption({ index: 1 });
    await page.getByLabel('Amount').fill(form.amount);
    await page.getByLabel('Date').fill(form.date);

    let simulatedFailureObserved = false;
    await page.route('**/api/**/expenses', async route => {
      if (route.request().method() === 'POST') {
        simulatedFailureObserved = true;
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Simulated temporary failure' }),
        });
        return;
      }
      await route.continue();
    });

    await page.getByRole('button', { name: /submit expense/i }).click();
    await expect.poll(() => simulatedFailureObserved).toBe(true);
    await expect(page.getByLabel('Description')).toHaveValue(form.description);
    await expect(page.getByLabel('Vendor')).toHaveValue(form.vendor);
    await expect(page.getByLabel('Amount')).toHaveValue(form.amount);
    await expect(page.locator('main')).toContainText(/error|failed|try again|unable/i);
  });

  test('browser Forward restores the report after Back returns to expenses', async ({ page }) => {
    await signIn(page);
    await page.goto('/expenses');
    await expect(page.getByRole('heading', { name: 'My Expenses' })).toBeVisible();

    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Expense Reports' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/expenses$/);
    await expect(page.getByRole('heading', { name: 'My Expenses' })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole('heading', { name: 'Expense Reports' })).toBeVisible();
  });
});
