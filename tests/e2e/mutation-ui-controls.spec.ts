import { expect, Page, test } from '@playwright/test';
import { environment, TestRole } from '../../src/config/environment.js';
import { LoginPage } from '../../src/pages/login.page.js';

async function signIn(page: Page, role: TestRole = 'employee1') {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(environment.email(role), environment.seedPassword());
  await expect(page.getByTestId('user-menu')).toBeVisible();
}

// Makes pointer actions visible in retained Playwright videos/screenshots.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const cursor = document.createElement('div');
      cursor.dataset.testCursor = 'true';
      Object.assign(cursor.style, {
        position: 'fixed', width: '18px', height: '18px', borderRadius: '50%',
        background: 'rgba(255, 30, 30, .45)', border: '2px solid #fff',
        boxShadow: '0 0 0 2px #d00', pointerEvents: 'none', zIndex: '2147483647',
        transform: 'translate(-50%, -50%)', left: '0', top: '0',
      });
      document.body.append(cursor);
      window.addEventListener('pointermove', event => {
        cursor.style.left = `${event.clientX}px`;
        cursor.style.top = `${event.clientY}px`;
      });
      window.addEventListener('pointerdown', () => cursor.style.background = 'rgba(255, 0, 0, .9)');
      window.addEventListener('pointerup', () => cursor.style.background = 'rgba(255, 30, 30, .45)');
    });
  });
});

test.describe('UI control mutation and exploratory scenarios', () => {
  test('MUT-UI-01 blank login exposes an accessible error and focuses the first invalid field', async ({ page }) => {
    await new LoginPage(page).goto();
    await page.getByTestId('login-submit').click();
    const error = page.getByTestId('login-error');
    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute('role', 'alert');
    await expect(page.getByTestId('login-email')).toBeFocused();
  });

  test('MUT-UI-02 account menu supports Escape and restores keyboard focus', async ({ page }) => {
    await signIn(page);
    const trigger = page.getByTestId('user-menu');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(environment.email('employee1'))).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText(environment.email('employee1'))).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('MUT-UI-03 global search has a programmatic accessible name', async ({ page }) => {
    await signIn(page);
    await expect(page.getByPlaceholder('Search expenses, vendors...')).toHaveAccessibleName(/search/i);
  });

  test('MUT-UI-04 expense-table search has a programmatic accessible name', async ({ page }) => {
    await signIn(page);
    await page.goto('/expenses');
    await expect(page.getByPlaceholder('Search vendor or description')).toHaveAccessibleName(/search/i);
  });

  test('MUT-UI-05 selected status filter is announced to assistive technology', async ({ page }) => {
    await signIn(page);
    await page.goto('/expenses');
    const approved = page.getByRole('button', { name: 'Approved', exact: true });
    await approved.click();
    await expect(approved).toHaveAttribute('aria-pressed', 'true');
  });

  test('MUT-UI-06 pagination has correct boundary controls and changes page', async ({ page }) => {
    await signIn(page);
    await page.goto('/expenses');
    const range = page.getByText(/Showing \d+.+of \d+/);
    const firstRange = await range.textContent();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(range).not.toHaveText(firstRange ?? '');
    await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  test('MUT-UI-07 no-match search communicates an explicit empty state', async ({ page }) => {
    await signIn(page);
    await page.goto('/expenses');
    await page.getByPlaceholder('Search vendor or description').fill('NO-MATCH-\u2603-999999');
    await expect(page.locator('main')).toContainText(/no expenses|no results|nothing found/i);
  });

  test('MUT-UI-08 special characters in search do not crash or expose a server error', async ({ page }) => {
    const serverErrors: number[] = [];
    page.on('response', response => {
      if (response.status() >= 500) serverErrors.push(response.status());
    });
    await signIn(page);
    await page.goto('/expenses');
    await page.getByPlaceholder('Search vendor or description').fill("<script>'\\\"&%_\\u{1F4A5}");
    await expect(page.getByRole('heading', { name: 'My Expenses' })).toBeVisible();
    expect(serverErrors).toEqual([]);
  });

  test('MUT-UI-09 report filters have associated accessible labels', async ({ page }) => {
    await signIn(page);
    await page.goto('/reports');
    for (const label of ['From', 'To', 'Category', 'Status']) {
      await expect(page.getByLabel(label, { exact: true })).toHaveCount(1);
    }
  });

  test('MUT-UI-10 invalid report date range is rejected before requesting data', async ({ page }) => {
    await signIn(page);
    await page.goto('/reports');
    let invalidRequestObserved = false;
    page.on('request', request => {
      if (/dateFrom=2026-10-20/.test(request.url()) && /dateTo=2026-10-01/.test(request.url())) {
        invalidRequestObserved = true;
      }
    });
    const dates = page.locator('input[type="date"]');
    await dates.nth(0).fill('2026-10-20');
    await dates.nth(1).fill('2026-10-01');
    await page.waitForTimeout(600);
    expect(invalidRequestObserved).toBe(false);
    await expect(page.locator('main')).toContainText(/from.*before|invalid date range|start date/i);
  });

  test('MUT-UI-11 manual-entry Notes control is associated with its visible label', async ({ page }) => {
    await signIn(page);
    await page.goto('/expenses/new');
    await page.getByRole('button', { name: /skip/i }).click();
    await expect(page.getByLabel('Notes', { exact: true })).toHaveCount(1);
  });

  test('MUT-UI-12 blank manual form prevents submission and reports field errors', async ({ page }) => {
    await signIn(page);
    await page.goto('/expenses/new');
    await page.getByRole('button', { name: /skip/i }).click();
    let createAttempted = false;
    await page.route('**/api/**/expenses', async route => {
      if (route.request().method() === 'POST') createAttempted = true;
      await route.abort();
    });
    const submit = page.getByRole('button', { name: /submit|save|create expense/i });
    await submit.click();
    expect(createAttempted).toBe(false);
    await expect(page.locator('[role="alert"], [aria-live="assertive"], .text-red-500, .text-red-600').first()).toBeVisible();
  });

  test('MUT-UI-13 mobile viewport has no page-level horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await signIn(page);
    await page.goto('/expenses');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
