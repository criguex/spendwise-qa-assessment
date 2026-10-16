import { expect, test } from '@playwright/test';
import { environment } from '../../src/config/environment.js';
import { LoginPage } from '../../src/pages/login.page.js';

test.describe('Critical accessibility and role navigation', () => {
  test('E2E-A11 login controls have accessible names and required test IDs', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(page.getByTestId('login-email')).toHaveAccessibleName(/email/i);
    await expect(page.getByTestId('login-password')).toHaveAccessibleName(/password/i);
    await expect(page.getByTestId('login-password-toggle')).toHaveAccessibleName(/password/i);
    await expect(page.getByTestId('login-submit')).toHaveAccessibleName(/sign in|log in/i);
  });

  test('E2E-A12 Manager navigation includes approvals but not policy configuration', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(environment.email('manager1'), environment.seedPassword());
    await expect(page.getByRole('link', { name: /approvals/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /policy engine/i })).toHaveCount(0);
  });

  test('E2E-A13 Finance navigation combines employee, approval and policy capabilities', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(environment.email('finance'), environment.seedPassword());
    await expect(page.getByRole('link', { name: /new expense/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /approvals/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /policy engine/i })).toBeVisible();
  });
});
