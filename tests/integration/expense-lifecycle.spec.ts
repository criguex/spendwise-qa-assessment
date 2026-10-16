import { test, expect } from '../fixtures.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';

test.describe('Expense lifecycle integration', () => {
  test('INT-01 @smoke create -> retrieve -> audit keeps identity and automatic decision', async ({ auth, expenses }) => {
    const employee = await auth.loginAs('employee1');
    const create = await expenses.create(employee.accessToken, new ExpenseBuilder().withAmount(10).build());
    expect(create.status(), await create.text()).toBe(201);
    const created = await create.json();
    expect(created.status).toBe('AutoApproved');

    const detail = await expenses.get(employee.accessToken, created.id);
    expect(detail.status()).toBe(200);
    expect((await detail.json()).expenseNumber).toBe(created.expenseNumber);

    const history = await expenses.history(employee.accessToken, created.id);
    expect(history.status()).toBe(200);
    const events = await history.json();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ toStatus: 'AutoApproved', performedBy: 'Policy Engine' });
  });

  test('INT-02 @negative Manager cannot see an unrelated employee expense', async ({ auth, expenses }) => {
    const employee = await auth.loginAs('employee3');
    const create = await expenses.create(employee.accessToken, new ExpenseBuilder().withAmount(10).build());
    expect(create.status()).toBe(201);
    const created = await create.json();

    const unrelatedManager = await auth.loginAs('manager1');
    expect((await expenses.get(unrelatedManager.accessToken, created.id)).status()).toBe(404);
  });

  test('INT-03 @negative final automatic decision cannot be deleted', async ({ auth, expenses }) => {
    const employee = await auth.loginAs('employee2');
    const create = await expenses.create(employee.accessToken, new ExpenseBuilder().withAmount(10).build());
    expect(create.status()).toBe(201);
    const created = await create.json();
    expect((await expenses.remove(employee.accessToken, created.id)).status()).toBeGreaterThanOrEqual(400);
    expect((await expenses.get(employee.accessToken, created.id)).status()).toBe(200);
  });
});
