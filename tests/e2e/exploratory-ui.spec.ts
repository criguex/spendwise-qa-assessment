import { expect, test } from '../fixtures.js';
import { environment } from '../../src/config/environment.js';
import { LoginPage } from '../../src/pages/login.page.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';

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

  test('EXPUI-03 approval queue identifies the submitter', async ({ page, auth, expenses }) => {
    const employee = await auth.loginAs('employee1');
    const marker = `EXPUI-03-${Date.now()}-${crypto.randomUUID()}`;
    const created = await expenses.create(employee.accessToken, new ExpenseBuilder()
      .withDescription(marker).withAmount(125).build());
    expect(created.status(), await created.text()).toBe(201);
    await signIn(page, 'finance');
    await page.goto('/approvals');
    await expect(page.getByRole('heading', { name: 'Approval queue' })).toBeVisible();
    const controlledRow = page.locator('main').getByText(marker, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"grid")][1]');
    await expect(controlledRow).toBeVisible();
    await expect(controlledRow).toContainText(/Elena Employee|Ethan Employee|employee\d@spendwise\.test/i);
  });

  test('EXPUI-04 final expenses do not expose delete actions', async ({ page, auth, expenses, approvals }) => {
    const employee = await auth.loginAs('employee1');
    const marker = `EXPUI-04-${Date.now()}-${crypto.randomUUID()}`;
    const createdResponse = await expenses.create(employee.accessToken, new ExpenseBuilder()
      .withDescription(marker).withAmount(125).build());
    expect(createdResponse.status(), await createdResponse.text()).toBe(201);
    const created = await createdResponse.json();
    const manager = await auth.loginAs('manager1');
    expect((await approvals.approve(manager.accessToken, created.id)).status()).toBe(200);
    await signIn(page, 'employee1');
    await page.goto('/expenses');
    const searched = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname.endsWith('/api/v1/expenses') && url.searchParams.get('search') === marker;
    });
    await page.getByPlaceholder('Search vendor or description').fill(marker);
    expect((await searched).status()).toBe(200);
    const approvedExpense = page.getByText(marker, { exact: true });
    await expect(approvedExpense).toBeVisible();
    const approvedContainer = approvedExpense.locator('xpath=ancestor::div[contains(@class,"border-b") or contains(@class,"grid")][1]');
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
