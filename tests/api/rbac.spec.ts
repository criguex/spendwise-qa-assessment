import { test, expect } from '../fixtures.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';

test.describe('Role-based access control', () => {
  test('RBAC-01 @negative Employee cannot read policies', async ({ auth, policies }) => {
    const session = await auth.loginAs('employee1');
    expect((await policies.list(session.accessToken)).status()).toBe(403);
  });

  test('RBAC-02 @negative Manager cannot read policies', async ({ auth, policies }) => {
    const session = await auth.loginAs('manager1');
    expect((await policies.list(session.accessToken)).status()).toBe(403);
  });

  test('RBAC-03 Finance can read but cannot write policies', async ({ auth, policies }) => {
    const session = await auth.loginAs('finance');
    expect((await policies.list(session.accessToken)).status()).toBe(200);
    const response = await policies.create(session.accessToken, {
      name: `QA forbidden ${Date.now()}`, action: 'AutoApprove', maxAmount: 1,
      requiresReceipt: false, isActive: false,
    });
    expect(response.status()).toBe(403);
  });

  test('RBAC-04 @negative Administrator cannot create expenses', async ({ auth, expenses }) => {
    const session = await auth.loginAs('admin');
    expect((await expenses.create(session.accessToken, new ExpenseBuilder().build())).status()).toBe(403);
  });

  test('RBAC-05 @negative Administrator cannot access approval queue', async ({ auth, approvals }) => {
    const session = await auth.loginAs('admin');
    expect((await approvals.pending(session.accessToken)).status()).toBe(403);
  });
});
