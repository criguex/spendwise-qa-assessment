import { test, expect } from '../fixtures.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';

const uploadedReceipt = 'https://example.invalid/qa-receipt.pdf';

test.describe('Receipt required at $25+ (RN-20, Anexo E)', () => {
  test('RCPT-01 @boundary accepts 24.99 without receipt', async ({ auth, expenses }) => {
    const session = await auth.loginAs('employee3');
    const response = await expenses.create(session.accessToken, new ExpenseBuilder().withAmount(24.99).build());
    expect(response.status(), await response.text()).toBe(201);
  });

  for (const scenario of [
    { id: 'RCPT-02', amount: 25, label: 'exactly 25' },
    { id: 'RCPT-03', amount: 80, label: 'the 80 USD example from Annex E' },
  ]) {
    test(`${scenario.id} @negative @boundary rejects ${scenario.label} without receipt`, async ({ auth, expenses }) => {
      const session = await auth.loginAs('employee3');
      const response = await expenses.create(session.accessToken, new ExpenseBuilder().withAmount(scenario.amount).build());
      expect(response.status(), await response.text()).toBe(400);
    });
  }
});

test.describe('Auto-approve under $50 boundary (Anexo E)', () => {
  for (const scenario of [
    { id: 'THR-01', amount: 49.99, status: 'AutoApproved' },
    { id: 'THR-02', amount: 50, status: 'PendingApproval' },
  ]) {
    test(`${scenario.id} @boundary ${scenario.amount} with receipt ends ${scenario.status}`, async ({ auth, expenses }) => {
      const session = await auth.loginAs('employee3');
      const response = await expenses.create(session.accessToken, new ExpenseBuilder().withAmount(scenario.amount).withReceipt(uploadedReceipt).build());
      expect(response.status(), await response.text()).toBe(201);
      expect((await response.json()).status).toBe(scenario.status);
    });
  }
});
