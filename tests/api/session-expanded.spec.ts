import { environment, TestRole } from '../../src/config/environment.js';
import { expect, test } from '../fixtures.js';

test.describe('Session and identity expanded coverage', () => {
  for (const role of ['employee1', 'manager1', 'finance', 'admin'] as TestRole[]) {
    test(`AUTHX-${role} /auth/me reflects the authenticated ${role}`, async ({ auth }) => {
      const session = await auth.loginAs(role);
      const response = await auth.me(session.accessToken);
      expect(response.status()).toBe(200);
      const me = await response.json();
      expect(me.email).toBe(environment.email(role));
      expect(me.id).toBe(session.user.id);
      expect(me.roles).toEqual(session.user.roles);
    });
  }

  test('AUTHX-05 @negative an altered token is rejected', async ({ auth }) => {
    const session = await auth.loginAs('employee1');
    const response = await auth.me(`${session.accessToken.slice(0, -2)}xx`);
    expect(response.status()).toBe(401);
  });

  test('AUTHX-06 logout follows the documented 204 contract', async ({ auth }) => {
    const session = await auth.loginAs('employee2');
    expect((await auth.logout(session.accessToken)).status()).toBe(204);
  });
});
