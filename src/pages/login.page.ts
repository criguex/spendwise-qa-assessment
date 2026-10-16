import { expect, Page } from '@playwright/test';
export class LoginPage {
  constructor(private readonly page: Page) {}
  async goto(): Promise<void> { await this.page.goto('/__gate'); }
  async login(email: string, password: string): Promise<void> {
    await this.page.getByTestId('login-email').fill(email);
    await this.page.getByTestId('login-password').fill(password);
    await this.page.getByTestId('login-submit').click();
  }
  async expectError(message: RegExp): Promise<void> { await expect(this.page.getByTestId('login-error')).toContainText(message); }
}
