import { test, expect } from '../fixtures.js';
import { categorySchema, expenseListSchema, loginSchema } from '../../src/contracts/schemas.js';
import { environment } from '../../src/config/environment.js';

test.describe('Runtime contracts', () => {
  test('CON-04 @smoke login response matches the consumer schema', async ({ auth }) => {
    const response = await auth.loginResponse(environment.email('employee1'), environment.seedPassword());
    expect(response.status()).toBe(200);
    loginSchema.parse(await response.json());
  });

  test('CON-05 expense list matches pagination schema', async ({ auth, expenses }) => {
    const session = await auth.loginAs('employee1');
    const response = await expenses.list(session.accessToken);
    expect(response.status()).toBe(200);
    expenseListSchema.parse(await response.json());
  });

  test('CON-06 category entries match schema', async ({ auth, http }) => {
    const session = await auth.loginAs('employee1');
    const response = await http.get('/api/v1/categories', session.accessToken);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(9);
    body.forEach((item: unknown) => categorySchema.parse(item));
  });
});
