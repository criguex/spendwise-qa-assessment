import { expect, Page } from '@playwright/test';
export class UserMenuComponent {
  constructor(private readonly page: Page) {}
  async expectIdentity(name: string): Promise<void> {
    await this.page.getByTestId('user-menu').click();
    await expect(this.page.getByTestId('user-menu-name')).toContainText(name);
  }
  async signOut(): Promise<void> {
    await this.page.getByTestId('user-menu').click();
    await this.page.getByTestId('user-menu-signout').click();
  }
}
