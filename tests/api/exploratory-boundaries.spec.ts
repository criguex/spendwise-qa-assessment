import { ExpenseBuilder, type ExpenseInput } from '../../src/data/expense-builder.js';
import { expect, test } from '../fixtures.js';

test.describe('Exploratory API boundaries', () => {
  for (const scenario of [
    { id: 'EXPA-01', body: new ExpenseBuilder().withDescription('   ').build(), label: 'blank description' },
    { id: 'EXPA-02', body: { description: 'QA missing date', amount: 10 } as ExpenseInput, label: 'missing date' },
    { id: 'EXPA-03', body: new ExpenseBuilder().withDate('not-a-date').build(), label: 'malformed date' },
  ]) {
    test(`${scenario.id} @negative rejects ${scenario.label} with 400`, async ({ auth, expenses }) => {
      const employee = await auth.loginAs('employee2');
      const response = await expenses.create(employee.accessToken, scenario.body);
      expect(response.status(), await response.text()).toBe(400);
    });
  }

  test('EXPA-04 client cannot choose owner, state or expense number', async ({ auth, expenses }) => {
    const employee = await auth.loginAs('employee2');
    const response = await expenses.create(employee.accessToken, new ExpenseBuilder()
      .withClientControlled('ownerId', '33333333-0000-0000-0000-000000000001')
      .withClientControlled('status', 'Approved')
      .withClientControlled('expenseNumber', 'EXP-1900-0001')
      .build());
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.status).toBe('AutoApproved');
    expect(body.expenseNumber).not.toBe('EXP-1900-0001');
    expect(body.ownerId).not.toBe('33333333-0000-0000-0000-000000000001');
  });

  test('EXPA-05 arbitrary receipt URL does not count as an uploaded receipt', async ({ auth, expenses }) => {
    const employee = await auth.loginAs('employee2');
    const response = await expenses.create(employee.accessToken, new ExpenseBuilder()
      .withAmount(30)
      .withReceipt('https://example.invalid/not-an-uploaded-receipt.pdf')
      .build());
    expect(response.status(), await response.text()).toBe(400);
  });

  test('EXPA-06 reversed report interval is rejected with 400', async ({ auth, analytics }) => {
    const finance = await auth.loginAs('finance');
    const response = await analytics.reports(finance.accessToken, '?dateFrom=2026-10-20&dateTo=2026-10-01');
    expect(response.status(), await response.text()).toBe(400);
  });

  test('EXPA-07 unknown category filter is rejected with 400', async ({ auth, analytics }) => {
    const finance = await auth.loginAs('finance');
    const response = await analytics.reports(finance.accessToken, '?categoryId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(response.status(), await response.text()).toBe(400);
  });

  test('EXPA-08 invalid status filter is rejected instead of silently ignored', async ({ auth, analytics }) => {
    const finance = await auth.loginAs('finance');
    const response = await analytics.reports(finance.accessToken, '?status=MadeUpStatus');
    expect(response.status(), await response.text()).toBe(400);
  });
});
