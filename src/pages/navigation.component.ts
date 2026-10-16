import { expect, Page } from '@playwright/test';

export class NavigationComponent {
  constructor(private readonly page: Page) {}
  item(name: string | RegExp) { return this.page.getByRole('link', { name }); }
  async expectVisible(name: string | RegExp) { await expect(this.item(name).first()).toBeVisible(); }
  async expectHidden(name: string | RegExp) { await expect(this.item(name)).toHaveCount(0); }
}
