import { expect, test } from '../fixtures.js';
import type { Page } from '@playwright/test';
import { environment, type TestRole } from '../../src/config/environment.js';
import { LoginPage } from '../../src/pages/login.page.js';

test.use({ video: 'on', screenshot: 'only-on-failure' });

async function visibleCursor(page: Page) {
  await page.addInitScript(() => {
    addEventListener('DOMContentLoaded', () => {
      const cursor = document.createElement('div');
      cursor.id = 'playwright-visible-cursor';
      Object.assign(cursor.style, {
        position: 'fixed', width: '22px', height: '22px', borderRadius: '50%',
        border: '3px solid #ef4444', background: '#fef08a99', zIndex: '2147483647',
        pointerEvents: 'none', transform: 'translate(-50%, -50%)', left: '12px', top: '12px',
      });
      document.body.append(cursor);
      addEventListener('pointermove', event => {
        cursor.style.left = `${event.clientX}px`;
        cursor.style.top = `${event.clientY}px`;
      });
    });
  });
}

async function signIn(page: Page, role: TestRole = 'employee1') {
  await visibleCursor(page);
  const login = new LoginPage(page);
  await login.goto();
  await login.login(environment.email(role), environment.seedPassword());
  await expect(page.getByTestId('user-menu')).toBeVisible();
}

async function openManualForm(page: Page) {
  await page.goto('/expenses/new');
  await page.getByRole('button', { name: /skip/i }).click();
  await expect(page.getByRole('button', { name: /submit expense/i })).toBeVisible();
}

async function expenseRows(page: Page) {
  await page.locator('.animate-pulse').first().waitFor({ state: 'hidden' }).catch(() => {});
  const rows = page.locator('main .divide-y').last().locator(':scope > div');
  await expect(rows.first()).toBeVisible();
  return rows;
}

test.describe('Navigation and state mutation charters', () => {
  test('MUT-STATE-01 browser refresh does not submit a partially completed expense', async ({ page, auth, expenses }) => {
    await signIn(page);
    await openManualForm(page);
    const marker = `refresh-not-submitted-${Date.now()}`;
    await page.getByLabel('Description').fill(marker);
    await page.getByLabel('Amount').fill('12.34');
    await page.reload();
    await page.goto('/expenses');
    await expect(page.getByRole('heading', { name: 'My Expenses' })).toBeVisible();
    const employee = await auth.loginAs('employee1');
    const response = await expenses.list(employee.accessToken, `?search=${encodeURIComponent(marker)}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.totalCount).toBe(0);
    expect(body.items).toHaveLength(0);
  });

  test('MUT-STATE-02 Back from manual entry cancels without creating a draft or expense', async ({ page, auth, expenses }) => {
    await signIn(page);
    await openManualForm(page);
    const marker = `back-not-submitted-${Date.now()}`;
    await page.getByLabel('Description').fill(marker);
    await page.getByLabel('Amount').fill('23.45');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('button', { name: /upload receipt/i })).toBeVisible();
    await page.goto('/expenses');
    await expect(page.getByRole('heading', { name: 'My Expenses' })).toBeVisible();
    const employee = await auth.loginAs('employee1');
    const response = await expenses.list(employee.accessToken, `?search=${encodeURIComponent(marker)}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.totalCount).toBe(0);
    expect(body.items).toHaveLength(0);
  });

  test('MUT-STATE-03 repeated submit gesture creates exactly one expense', async ({ page }) => {
    await signIn(page);
    await openManualForm(page);
    const marker = `double-submit-${Date.now()}`;
    await page.getByLabel('Description').fill(marker);
    await page.getByLabel('Amount').fill('11.11');
    const submit = page.getByRole('button', { name: /submit expense/i });
    await submit.dblclick();
    await expect(page).toHaveURL(/\/expenses(?:\/[^/]+)?$/);
    await page.goto('/expenses');
    const searched = page.waitForResponse(response => response.url().includes('/api/v1/expenses') && response.url().includes(marker));
    await page.getByPlaceholder('Search vendor or description').fill(marker);
    await searched;
    await expect(page.getByText(marker, { exact: true })).toHaveCount(1);
  });

  test('MUT-STATE-04 status filter returns only the selected lifecycle state', async ({ page }) => {
    await signIn(page);
    await page.goto('/expenses');
    await expenseRows(page);
    const filtered = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname.endsWith('/api/v1/expenses') && url.searchParams.get('status') === 'Approved';
    });
    await page.getByRole('button', { name: 'Approved', exact: true }).click();
    expect((await filtered).status()).toBe(200);
    const rows = await expenseRows(page);
    await expect(rows.first()).toBeVisible();
    const statuses = await rows.evaluateAll(items => items.map(row => row.children[6]?.textContent ?? ''));
    for (const status of statuses) {
      expect(status.trim()).toBe('Approved');
    }
  });

  test('MUT-STATE-05 pagination Next changes page and Previous restores the first page', async ({ page }) => {
    await signIn(page);
    await page.goto('/expenses');
    const firstRows = await expenseRows(page);
    const firstPageId = (await firstRows.first().locator(':scope > div').first().innerText()).trim();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText(/Showing 21–\d+ of \d+/)).toBeVisible();
    const secondRows = await expenseRows(page);
    const secondPageId = (await secondRows.first().locator(':scope > div').first().innerText()).trim();
    expect(secondPageId).not.toBe(firstPageId);
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    const restoredRows = await expenseRows(page);
    await expect(restoredRows.first().locator(':scope > div').first()).toHaveText(firstPageId);
  });

  test('MUT-STATE-06 changing status while on page two resets pagination safely', async ({ page }) => {
    await signIn(page);
    await page.goto('/expenses');
    await expenseRows(page);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    const filtered = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname.endsWith('/api/v1/expenses')
        && url.searchParams.has('status');
    });
    await page.getByRole('button', { name: 'Pending', exact: true }).click();
    const filteredResponse = await filtered;
    expect(filteredResponse.status()).toBe(200);
    const filteredUrl = new URL(filteredResponse.url());
    expect(filteredUrl.searchParams.get('status')).toBe('PendingApproval');
    expect(filteredUrl.searchParams.get('page')).toBe('1');
    const rows = await expenseRows(page);
    const statuses = await rows.evaluateAll(items => items.map(row => row.children[6]?.textContent ?? ''));
    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses.every(status => status.trim() === 'Pending Approval')).toBe(true);
  });

  test('MUT-STATE-07 browser Back restores the expenses page after visiting a report', async ({ page }) => {
    await signIn(page);
    await page.goto('/expenses');
    await expect(page.getByRole('heading', { name: 'My Expenses' })).toBeVisible();
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Expense Reports' })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/expenses$/);
    await expect(page.getByRole('heading', { name: 'My Expenses' })).toBeVisible();
  });

  test('MUT-STATE-08 unknown deep link fails gracefully without exposing protected data', async ({ page }) => {
    await signIn(page);
    await page.goto('/route-that-does-not-exist');
    await expect(page.locator('body')).toContainText(/not found|does not exist|404/i);
    await expect(page.locator('body')).not.toContainText(/stack trace|exception|sql/i);
  });

  test('MUT-STATE-09 logout remains effective after Back and hard refresh', async ({ page }) => {
    await signIn(page);
    await page.goto('/expenses');
    await page.getByTestId('user-menu').click();
    await page.getByTestId('user-menu-signout').click();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await page.goBack();
    await page.reload();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'My Expenses' })).toHaveCount(0);
  });

  test('MUT-STATE-10 report filters survive Refresh action and remain reflected in results', async ({ page }) => {
    await signIn(page);
    await page.goto('/reports');
    const status = page.locator('select').nth(1);
    await status.selectOption({ label: 'Approved' });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(status).toHaveValue('Approved');
    await page.locator('.animate-pulse').first().waitFor({ state: 'hidden' }).catch(() => {});
    await expect(page.getByText(/\d+ expenses?/).last()).toBeVisible();
    const count = Number((await page.getByText(/\d+ expenses?/).last().innerText()).match(/\d+/)?.[0] ?? '0');
    if (count === 0) {
      await expect(page.getByText(/no expenses match/i)).toBeVisible();
    } else {
      const rows = page.locator('main .divide-y').last().locator(':scope > div');
      await expect(rows.first()).toBeVisible();
      const reportStatuses = await rows.evaluateAll(items => items.map(row => row.lastElementChild?.textContent ?? ''));
      for (const rowStatus of reportStatuses) expect(rowStatus.trim()).toBe('Approved');
    }
  });
});
