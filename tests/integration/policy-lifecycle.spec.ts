import { expect, test } from '../fixtures.js';

test.describe('Policy lifecycle integration', () => {
  test('INT-POL-01 Administrator creates, updates and deletes an inactive rule', async ({ auth, policies }) => {
    const admin = await auth.loginAs('admin');
    const name = `QA inactive lifecycle ${Date.now()}`;
    let id: string | undefined;
    try {
      const createdResponse = await policies.create(admin.accessToken, {
        name, description: 'Temporary isolated QA rule', action: 'AutoApprove',
        maxAmount: 0, requiresReceipt: false, isActive: false,
      });
      expect(createdResponse.status()).toBe(201);
      const created = await createdResponse.json();
      id = created.id;
      expect(created).toEqual(expect.objectContaining({ name, maxAmount: 0, isActive: false }));

      const updatedName = `${name} updated`;
      const updatedResponse = await policies.update(admin.accessToken, id!, {
        name: updatedName, description: 'Updated isolated QA rule', action: 'RequireApproval',
        maxAmount: 0, requiresReceipt: false, isActive: false,
      });
      expect(updatedResponse.status()).toBe(200);
      expect(await updatedResponse.json()).toEqual(expect.objectContaining({ id, name: updatedName, isActive: false }));
    } finally {
      if (id) expect((await policies.remove(admin.accessToken, id)).status()).toBe(204);
    }
  });

  test('INT-POL-02 deleted inactive rule no longer appears in the list', async ({ auth, policies }) => {
    const admin = await auth.loginAs('admin');
    const created = await policies.create(admin.accessToken, {
      name: `QA delete verification ${Date.now()}`, action: 'AutoApprove', maxAmount: 0,
      requiresReceipt: false, isActive: false,
    });
    expect(created.status()).toBe(201);
    const id = (await created.json()).id;
    expect((await policies.remove(admin.accessToken, id)).status()).toBe(204);
    const list = await (await policies.list(admin.accessToken)).json();
    expect(list.some((policy: { id: string }) => policy.id === id)).toBeFalsy();
  });

  test('INT-POL-03 Finance cannot update an existing rule', async ({ auth, policies }) => {
    const finance = await auth.loginAs('finance');
    const list = await (await policies.list(finance.accessToken)).json();
    expect(list.length).toBeGreaterThan(0);
    expect((await policies.update(finance.accessToken, list[0].id, {
      ...list[0], name: 'QA forbidden update', isActive: false,
    })).status()).toBe(403);
  });
});
