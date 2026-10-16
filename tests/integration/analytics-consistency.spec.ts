import { expect, test } from '../fixtures.js';

test.describe('Analytics cross-module consistency', () => {
  test('INT-ANA-01 rejected expenses are excluded from report spending totals', async ({ auth, analytics }) => {
    const finance = await auth.loginAs('finance');
    const body = await (await analytics.reports(finance.accessToken)).json();
    const expected = body.expenses
      .filter((expense: { status: string }) => expense.status !== 'Rejected')
      .reduce((sum: number, expense: { amount: number }) => sum + expense.amount, 0);
    expect(body.totalAmount).toBeCloseTo(expected, 2);
  });

  test('INT-ANA-02 category aggregates exclude rejected expenses', async ({ auth, analytics }) => {
    const finance = await auth.loginAs('finance');
    const body = await (await analytics.reports(finance.accessToken)).json();
    const aggregate = body.byCategory.reduce((sum: number, row: { total: number }) => sum + row.total, 0);
    const nonRejected = body.expenses
      .filter((expense: { status: string }) => expense.status !== 'Rejected')
      .reduce((sum: number, expense: { amount: number }) => sum + expense.amount, 0);
    expect(aggregate).toBeCloseTo(nonRejected, 2);
  });

  test('INT-ANA-03 report total count matches non-rejected total population', async ({ auth, analytics }) => {
    const finance = await auth.loginAs('finance');
    const body = await (await analytics.reports(finance.accessToken)).json();
    const nonRejectedCount = body.expenses.filter((expense: { status: string }) => expense.status !== 'Rejected').length;
    expect(body.totalCount).toBe(nonRejectedCount);
  });
});
