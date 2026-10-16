import { test, expect } from '@playwright/test';
import { environment } from '../../src/config/environment.js';
import { AppPage } from '../../src/pages/app.page.js';
import { LoginPage } from '../../src/pages/login.page.js';

test.describe('Role navigation E2E with reusable components', () => {
  test('E2E-05 Employee menu exposes only Employee capabilities', async ({ page }) => {
    const login = new LoginPage(page);
    const app = new AppPage(page);
    await login.goto();
    await login.login(environment.email('employee1'), environment.seedPassword());
    await app.navigation.expectVisible(/new expense/i);
    await app.navigation.expectVisible(/my expenses/i);
    await app.navigation.expectHidden(/policy engine/i);
    await app.navigation.expectHidden(/approvals/i);
  });

  test('E2E-06 Employee direct access to policy configuration is denied', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(environment.email('employee1'), environment.seedPassword());
    await expect(page.getByTestId('user-menu')).toBeVisible();
    await page.goto('/policies');
    await expect(page.getByText(/don't have access to this page/i)).toBeVisible();
  });

  test('E2E-07 Administrator cannot see expense creation or approval navigation', async ({ page }) => {
    const login = new LoginPage(page);
    const app = new AppPage(page);
    await login.goto();
    await login.login(environment.email('admin'), environment.seedPassword());
    await app.navigation.expectVisible(/policy engine/i);
    await app.navigation.expectHidden(/new expense/i);
    await app.navigation.expectHidden(/approvals/i);
  });
});
