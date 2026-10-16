import { test, expect } from '@playwright/test';
import { environment } from '../../src/config/environment.js';
import { AppPage } from '../../src/pages/app.page.js';
import { LoginPage } from '../../src/pages/login.page.js';

test.describe('Authentication E2E with POM', () => {
  test('E2E-01 @smoke employee signs in and sees identity', async ({ page }) => {
    const login = new LoginPage(page);
    const app = new AppPage(page);
    await login.goto();
    await login.login(environment.email('employee1'), environment.seedPassword());
    await app.userMenu.expectIdentity('Elena Employee');
  });

  test('E2E-02 @negative invalid credentials show a visible error and preserve email', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(environment.email('employee1'), 'WrongPass1');
    await login.expectError(/invalid email or password/i);
    await expect(page.getByTestId('login-email')).toHaveValue(environment.email('employee1'));
  });

  test('E2E-03 protected deep link returns to the original route after login', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page.getByTestId('login-email')).toBeVisible();
    const login = new LoginPage(page);
    await login.login(environment.email('employee2'), environment.seedPassword());
    await expect(page).toHaveURL(/\/expenses/);
  });

  test('E2E-04 sign out prevents browser back from exposing protected data', async ({ page }) => {
    const login = new LoginPage(page);
    const app = new AppPage(page);
    await login.goto();
    await login.login(environment.email('employee1'), environment.seedPassword());
    await app.userMenu.signOut();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId('user-menu')).not.toBeVisible();
    await expect(page.getByText('Recent activity')).not.toBeVisible();
  });
});
