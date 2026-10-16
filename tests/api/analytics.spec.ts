import { expect, test } from '../fixtures.js';

test.describe('Dashboard and reports', () => {
  for (const role of ['employee1', 'manager1', 'finance', 'admin'] as const) {
    test(`ANA-${role}-01 dashboard exposes coherent metrics for ${role}`, async ({ auth, analytics }) => {
      const session = await auth.loginAs(role);
      const response = await analytics.dashboard(session.accessToken);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toEqual(expect.objectContaining({
        spendThisMonth: expect.any(Number), pendingCount: expect.any(Number),
        autoApprovedCount: expect.any(Number), autoApprovedTotal: expect.any(Number),
        recentExpenses: expect.any(Array), spendTrend: expect.any(Array),
      }));
      expect(body.pendingCount).toBeGreaterThanOrEqual(0);
      expect(body.autoApprovedCount).toBeLessThanOrEqual(body.autoApprovedTotal);
    });

    test(`ANA-${role}-02 reports arithmetic is internally consistent for ${role}`, async ({ auth, analytics }) => {
      const session = await auth.loginAs(role);
      const response = await analytics.reports(session.accessToken);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.totalCount).toBe(body.expenses.length);
      if (body.totalCount > 0) expect(body.averageAmount).toBeCloseTo(body.totalAmount / body.totalCount, 8);
      expect(body.byCategory.reduce((sum: number, row: { count: number }) => sum + row.count, 0)).toBe(body.totalCount);
    });
  }

  test('ANA-09 report date range includes only requested dates', async ({ auth, analytics }) => {
    const session = await auth.loginAs('finance');
    const response = await analytics.reports(session.accessToken, '?dateFrom=2026-10-01&dateTo=2026-10-10');
    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const expense of body.expenses) expect(expense.date >= '2026-10-01' && expense.date <= '2026-10-10').toBeTruthy();
  });

  test('ANA-10 @negative malformed report dates return 400 rather than 5xx', async ({ auth, analytics }) => {
    const session = await auth.loginAs('finance');
    expect((await analytics.reports(session.accessToken, '?dateFrom=not-a-date')).status()).toBe(400);
  });

  test('ANA-11 reports reject missing authentication', async ({ analytics }) => {
    expect((await analytics.reports('')).status()).toBe(401);
  });

  test('ANA-12 dashboard rejects missing authentication', async ({ analytics }) => {
    expect((await analytics.dashboard('')).status()).toBe(401);
  });
});
