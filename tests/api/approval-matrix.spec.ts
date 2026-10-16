import { expect, test } from '../fixtures.js';

test.describe('Approval authorization matrix', () => {
  for (const role of ['employee1', 'admin'] as const) {
    test(`APR-${role}-01 ${role} cannot read approval queue`, async ({ auth, approvals }) => {
      const session = await auth.loginAs(role);
      expect((await approvals.pending(session.accessToken)).status()).toBe(403);
    });
  }

  for (const role of ['manager1', 'manager2', 'finance'] as const) {
    test(`APR-${role}-02 ${role} can read its scoped approval queue`, async ({ auth, approvals }) => {
      const session = await auth.loginAs(role);
      const response = await approvals.pending(session.accessToken);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.items)).toBeTruthy();
      expect(body.totalCount).toBe(body.items.length);
      expect(body.totalAmount).toBeCloseTo(
        body.items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0), 2,
      );
    });
  }

  test('APR-06 unauthenticated approval is rejected', async ({ approvals }) => {
    expect((await approvals.approve('', crypto.randomUUID())).status()).toBe(401);
  });

  test('APR-07 Manager gets 404 for an unknown expense', async ({ auth, approvals }) => {
    const session = await auth.loginAs('manager1');
    expect((await approvals.approve(session.accessToken, crypto.randomUUID())).status()).toBe(404);
  });

  test('APR-08 Finance gets 404 for an unknown expense', async ({ auth, approvals }) => {
    const session = await auth.loginAs('finance');
    expect((await approvals.reject(session.accessToken, crypto.randomUUID(), 'QA valid reason')).status()).toBe(404);
  });
});
