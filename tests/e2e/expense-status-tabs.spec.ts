import { expect, test } from '../fixtures.js';
import { environment } from '../../src/config/environment.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';
import { LoginPage } from '../../src/pages/login.page.js';

test('E2E-M13 Pending tab lists the user expenses awaiting approval (RN-60)', async ({ page, auth, expenses }) => {
  const employee = await auth.loginAs('employee1');
  const description = `E2E-M13 pending ${Date.now()}`;
  const created = await expenses.create(employee.accessToken, new ExpenseBuilder().withDescription(description).withAmount(60).withReceipt('https://example.invalid/qa-receipt.pdf').build());
  expect(created.status(), await created.text()).toBe(201);
  expect((await created.json()).status).toBe('PendingApproval');

  const login = new LoginPage(page);
  await login.goto();
  await login.login(environment.email('employee1'), environment.seedPassword());
  await expect(page.getByTestId('user-menu')).toBeVisible();
  await page.goto('/expenses');
  await expect(page.getByRole('heading', { name: 'My Expenses' })).toBeVisible();
  const filtered = page.waitForResponse(response => response.url().includes('/api/v1/expenses?status='));
  await page.getByRole('button', { name: 'Pending', exact: true }).click();
  await filtered;
  await expect(page.getByText(description)).toBeVisible();
});
