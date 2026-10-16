import { Page } from '@playwright/test';
import { UserMenuComponent } from './components/user-menu.component.js';
import { NavigationComponent } from './navigation.component.js';
export class AppPage {
  readonly userMenu: UserMenuComponent;
  readonly navigation: NavigationComponent;
  constructor(readonly page: Page) {
    this.userMenu = new UserMenuComponent(page);
    this.navigation = new NavigationComponent(page);
  }
  async gotoProtected(path = '/expenses'): Promise<void> { await this.page.goto(path); }
}
