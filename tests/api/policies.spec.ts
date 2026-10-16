import { test, expect } from '../fixtures.js';

test.describe('Policy validation', () => {
  test('POL-01 @smoke initial policies are readable by Finance', async ({ auth, policies }) => {
    const session = await auth.loginAs('finance');
    const response = await policies.list(session.accessToken);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.map((item: any) => item.name)).toEqual(expect.arrayContaining(['Auto-approve under $50', 'Receipt required at $25+']));
  });

  for (const scenario of [
    { id: 'POL-02', name: '', action: 'AutoApprove', maxAmount: 1 },
    { id: 'POL-03', name: 'QA invalid action', action: 'DeleteEverything', maxAmount: 1 },
    { id: 'POL-04', name: 'QA negative threshold', action: 'AutoApprove', maxAmount: -1 },
    { id: 'POL-05', name: 'x'.repeat(201), action: 'AutoApprove', maxAmount: 1 },
  ]) {
    test(`${scenario.id} @negative rejects invalid policy data`, async ({ auth, policies }) => {
      const session = await auth.loginAs('admin');
      const response = await policies.create(session.accessToken, {
        ...scenario, requiresReceipt: false, isActive: false,
      });
      const text = await response.text();
      let createdId: string | undefined;
      if (response.status() === 201) {
        try { createdId = JSON.parse(text).id; } catch { /* response evidence remains in assertion */ }
      }
      try {
        expect(response.status(), text).toBe(400);
      } finally {
        if (createdId) await policies.remove(session.accessToken, createdId);
      }
    });
  }
});
