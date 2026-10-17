import { expect, test } from '../fixtures.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';

async function controlledPending(auth: any, expenses: any, role: 'employee1' | 'employee2' | 'employee3' | 'finance', marker: string) {
  const owner = await auth.loginAs(role);
  const response = await expenses.create(owner.accessToken, new ExpenseBuilder()
    .withDescription(`${marker}-${crypto.randomUUID()}`).withAmount(125).build());
  expect(response.status(), await response.text()).toBe(201);
  const expense = await response.json();
  expect(expense.status).toBe('PendingApproval');
  return expense;
}

test.describe('Approval authorization matrix', () => {
  for (const role of ['employee1', 'admin'] as const) {
    test(`APR-${role}-01 ${role} cannot read approval queue`, async ({ auth, approvals }) => {
      const session = await auth.loginAs(role);
      expect((await approvals.pending(session.accessToken)).status()).toBe(403);
    });
  }

  for (const role of ['manager1', 'manager2', 'finance'] as const) {
    test(`APR-${role}-02 ${role} can read its scoped approval queue`, async ({ auth, approvals, expenses }) => {
      const marker = `APR-${role}-02-${Date.now()}`;
      const insideRoles = role === 'manager1'
        ? ['employee1', 'employee2'] as const
        : role === 'manager2'
          ? ['employee3'] as const
          : ['employee1', 'employee2', 'employee3'] as const;
      const outsideRoles = role === 'manager1'
        ? ['employee3'] as const
        : role === 'manager2'
          ? ['employee1', 'employee2'] as const
          : ['finance'] as const;
      const inside = await Promise.all(insideRoles.map(ownerRole =>
        controlledPending(auth, expenses, ownerRole, `${marker}-inside-${ownerRole}`)));
      const outside = await Promise.all(outsideRoles.map(ownerRole =>
        controlledPending(auth, expenses, ownerRole, `${marker}-outside-${ownerRole}`)));
      const session = await auth.loginAs(role);
      const response = await approvals.pending(session.accessToken);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.items)).toBeTruthy();
      expect(body.totalCount).toBe(body.items.length);
      expect(body.totalAmount).toBeCloseTo(
        body.items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0), 2,
      );
      const ids = body.items.map((item: { id: string }) => item.id);
      for (const expense of inside) expect(ids).toContain(expense.id);
      for (const expense of outside) expect(ids).not.toContain(expense.id);
      expect(body.items.length).toBeGreaterThan(0);
      expect(body.items.every((item: { status: string }) => item.status === 'PendingApproval')).toBe(true);
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
