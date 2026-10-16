import { expect, test } from '../fixtures.js';

test.describe('Expense queries and ownership', () => {
  test('QUERY-01 search returns only matching descriptions or vendors', async ({ auth, expenses }) => {
    const session = await auth.loginAs('employee1');
    const response = await expenses.list(session.accessToken, '?search=Taxi&pageSize=100');
    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const item of body.items) expect(`${item.description} ${item.vendor ?? ''}`).toMatch(/taxi/i);
  });

  for (const status of ['AutoApproved', 'PendingApproval', 'Approved', 'Rejected']) {
    test(`QUERY-${status} status filter is exact and case insensitive`, async ({ auth, expenses }) => {
      const session = await auth.loginAs('finance');
      const response = await expenses.list(session.accessToken, `?status=${status.toLowerCase()}&pageSize=100`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      for (const item of body.items) expect(item.status).toBe(status);
    });
  }

  test('QUERY-06 list defaults to page 1 and pageSize 20', async ({ auth, expenses }) => {
    const session = await auth.loginAs('employee2');
    const body = await (await expenses.list(session.accessToken)).json();
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
    expect(body.items.length).toBeLessThanOrEqual(20);
  });

  test('QUERY-07 unknown expense is 404 without disclosure', async ({ auth, expenses }) => {
    const session = await auth.loginAs('employee1');
    expect((await expenses.get(session.accessToken, crypto.randomUUID())).status()).toBe(404);
  });

  test('QUERY-08 @negative unknown category is rejected', async ({ auth, expenses }) => {
    const session = await auth.loginAs('employee3');
    const response = await expenses.create(session.accessToken, {
      description: `QA unknown category ${Date.now()}`, amount: 10,
      date: new Date().toISOString().slice(0, 10), categoryId: crypto.randomUUID(),
    });
    expect(response.status(), await response.text()).toBe(400);
  });
});
