import { expect, test } from '../fixtures.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';

test.describe('Approval consumer contract', () => {
  test('APR-CON-01 queue items identify the submitter required for a decision', async ({ auth, approvals, expenses }) => {
    const employee = await auth.loginAs('employee1');
    const marker = `APR-CON-01-${Date.now()}-${crypto.randomUUID()}`;
    const createdResponse = await expenses.create(employee.accessToken, new ExpenseBuilder()
      .withDescription(marker).withAmount(125).build());
    expect(createdResponse.status(), await createdResponse.text()).toBe(201);
    const created = await createdResponse.json();
    expect(created.status).toBe('PendingApproval');
    const finance = await auth.loginAs('finance');
    const response = await approvals.pending(finance.accessToken);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items.length).toBeGreaterThan(0);
    const item = body.items.find((candidate: { id: string }) => candidate.id === created.id);
    expect(item).toBeDefined();
    const identityField = Object.keys(item).find(key => /owner|submit|employee|user/i.test(key));
    expect(identityField, `Missing submitter identity in controlled queue item`).toBeDefined();
  });
});
