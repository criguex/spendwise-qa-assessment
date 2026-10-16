import { test, expect } from '../fixtures.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';

test.describe('Expense validation and boundaries', () => {
  for (const scenario of [
    { id: 'VAL-01', amount: 0, label: 'zero' },
    { id: 'VAL-02', amount: -0.01, label: 'negative' },
    { id: 'VAL-03', amount: 1.001, label: 'more than two decimals' },
  ]) {
    test(`${scenario.id} @negative @boundary rejects ${scenario.label} amount`, async ({ auth, expenses }) => {
      const session = await auth.loginAs('employee3');
      const body = new ExpenseBuilder().withAmount(scenario.amount).build();
      const response = await expenses.create(session.accessToken, body);
      expect(response.status(), await response.text()).toBe(400);
    });
  }

  for (const scenario of [
    { id: 'VAL-04', field: 'description', length: 501 },
    { id: 'VAL-05', field: 'vendor', length: 201 },
    { id: 'VAL-06', field: 'notes', length: 1001 },
  ] as const) {
    test(`${scenario.id} @negative @boundary rejects ${scenario.field} above its maximum`, async ({ auth, expenses }) => {
      const session = await auth.loginAs('employee2');
      const builder = new ExpenseBuilder();
      if (scenario.field === 'description') builder.withDescription('x'.repeat(scenario.length));
      if (scenario.field === 'vendor') builder.withVendor('x'.repeat(scenario.length));
      if (scenario.field === 'notes') builder.withNotes('x'.repeat(scenario.length));
      const response = await expenses.create(session.accessToken, builder.build());
      expect(response.status(), await response.text()).toBe(400);
    });
  }

  test('VAL-07 @boundary accepts the minimum positive amount', async ({ auth, expenses }) => {
    const session = await auth.loginAs('employee2');
    const response = await expenses.create(session.accessToken, new ExpenseBuilder().withAmount(0.01).build());
    expect(response.status(), await response.text()).toBe(201);
  });

  test('VAL-08 @negative rejects missing required description', async ({ auth, expenses }) => {
    const session = await auth.loginAs('employee2');
    const body = new ExpenseBuilder().build();
    delete (body as Partial<typeof body>).description;
    const response = await expenses.create(session.accessToken, body);
    expect(response.status(), await response.text()).toBe(400);
  });

  test('VAL-09 @negative invalid pagination never produces 5xx', async ({ auth, expenses }) => {
    const session = await auth.loginAs('employee1');
    for (const query of ['?page=0', '?pageSize=-1', '?page=abc']) {
      const response = await expenses.list(session.accessToken, query);
      expect(response.status(), query).toBe(400);
    }
  });
});
