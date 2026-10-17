import { expect, test } from '../fixtures.js';

const fake = { name: 'not-a-receipt.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image or pdf') };

test.describe('Receipt extraction guardrails', () => {
  test('REC-01 @negative extraction requires authentication', async ({ receipts }) => {
    expect((await receipts.extract(undefined, fake)).status()).toBe(401);
  });

  test('REC-02 @negative Employee receives 400 for unsupported content', async ({ auth, receipts }) => {
    const session = await auth.loginAs('employee1');
    const response = await receipts.extract(session.accessToken, fake);
    expect(response.status(), await response.text()).toBe(400);
  });

  test('REC-03 @negative Administrator cannot extract receipts', async ({ auth, receipts }) => {
    const session = await auth.loginAs('admin');
    expect((await receipts.extract(session.accessToken, fake)).status()).toBe(403);
  });
});
