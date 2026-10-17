import { test, expect } from '../fixtures.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';

const receipt = 'https://example.invalid/qa-receipt.pdf';
const threshold = 0.02;

test.describe('Policy engine Block action (Anexo E §2 and §3)', () => {
  test('R6-INT-01 an active Block rule rejects only amounts above its limit', async ({ auth, expenses, policies }) => {
    const admin = await auth.loginAs('admin');
    const employee = await auth.loginAs('employee3');
    const rule = await policies.create(admin.accessToken, { name: `R6 Block over ${threshold} ${Date.now()}`, action: 'Block', maxAmount: threshold, requiresReceipt: false, isActive: true });
    expect(rule.status(), await rule.text()).toBe(201);
    const ruleId = (await rule.json()).id;
    const statuses: Record<string, string> = {};
    try {
      for (const amount of [0.03, 0.01]) {
        const response = await expenses.create(employee.accessToken, new ExpenseBuilder().withDescription(`R6-INT-01 ${amount} ${Date.now()}`).withAmount(amount).withReceipt(receipt).build());
        statuses[amount] = (await response.json()).status;
      }
    } finally {
      expect((await policies.remove(admin.accessToken, ruleId)).status()).toBe(204);
    }
    expect(statuses['0.03'], 'amount above the Block limit').toBe('Rejected');
    expect(statuses['0.01'], 'amount below the Block limit').not.toBe('Rejected');
  });

  test('R6-INT-02 an inactive Block rule does not influence the decision', async ({ auth, expenses, policies }) => {
    const admin = await auth.loginAs('admin');
    const employee = await auth.loginAs('employee3');
    const rule = await policies.create(admin.accessToken, { name: `R6 inactive Block ${Date.now()}`, action: 'Block', maxAmount: 1, requiresReceipt: false, isActive: false });
    expect(rule.status(), await rule.text()).toBe(201);
    const ruleId = (await rule.json()).id;
    try {
      const response = await expenses.create(employee.accessToken, new ExpenseBuilder().withDescription(`R6-INT-02 ${Date.now()}`).withAmount(10).build());
      expect((await response.json()).status).toBe('AutoApproved');
    } finally {
      expect((await policies.remove(admin.accessToken, ruleId)).status()).toBe(204);
    }
  });
});
