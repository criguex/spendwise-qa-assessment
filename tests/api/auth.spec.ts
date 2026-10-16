import { test, expect } from '../fixtures.js';
import { environment } from '../../src/config/environment.js';

test.describe('Authentication', () => {
  test('AUTH-01 @smoke valid credentials return the correct identity', async ({ auth }) => {
    const session = await auth.loginAs('employee1');
    expect(session.user.email).toBe(environment.email('employee1'));
    expect(session.user.roles).toContain('Employee');
  });

  for (const scenario of [
    { id: 'AUTH-02', email: `unknown-${Date.now()}@spendwise.test`, password: 'WrongPass1' },
    { id: 'AUTH-03', email: environment.email('inactive'), password: environment.seedPassword() },
    { id: 'AUTH-04', email: environment.email('employee1'), password: 'WrongPass1' },
  ]) {
    test(`${scenario.id} @negative does not disclose account state`, async ({ auth }) => {
      const response = await auth.loginResponse(scenario.email, scenario.password);
      expect(response.status()).toBe(401);
      expect(await response.json()).toMatchObject({ code: 'invalid_credentials', message: 'Invalid email or password.' });
    });
  }

  test('AUTH-05 @negative empty fields return 400', async ({ auth }) => {
    const response = await auth.loginResponse('', '');
    expect(response.status()).toBe(400);
  });

  test('AUTH-06 @negative protected resources reject missing token', async ({ http }) => {
    expect((await http.get('/api/v1/expenses')).status()).toBe(401);
  });
});
