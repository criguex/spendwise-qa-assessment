import { expect, test } from '../fixtures.js';

test.describe('Approval consumer contract', () => {
  test('APR-CON-01 queue items identify the submitter required for a decision', async ({ auth, approvals }) => {
    const finance = await auth.loginAs('finance');
    const response = await approvals.pending(finance.accessToken);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items.length).toBeGreaterThan(0);
    for (const item of body.items) {
      const identityField = Object.keys(item).find(key => /owner|submit|employee|user/i.test(key));
      expect(identityField, `Missing submitter identity in ${JSON.stringify(item)}`).toBeDefined();
    }
  });
});
