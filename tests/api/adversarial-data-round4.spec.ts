import { request, type APIRequestContext, type APIResponse } from '@playwright/test';
import { environment } from '../../src/config/environment.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';
import { expect, test } from '../fixtures.js';

const clientError = async (response: APIResponse, label: string) => {
  expect(response.status(), `${label}: ${await response.text()}`).toBeGreaterThanOrEqual(400);
  expect(response.status(), `${label}: server error`).toBeLessThan(500);
};

test.describe('Round 4 adversarial data and HTTP contract mutations', () => {
  for (const scenario of [
    { id: 'R4-DATA-01', label: 'null amount', mutate: (body: Record<string, unknown>) => { body.amount = null; } },
    { id: 'R4-DATA-02', label: 'boolean amount', mutate: (body: Record<string, unknown>) => { body.amount = true; } },
    { id: 'R4-DATA-03', label: 'object amount', mutate: (body: Record<string, unknown>) => { body.amount = { value: 10 }; } },
    { id: 'R4-DATA-04', label: 'null date', mutate: (body: Record<string, unknown>) => { body.date = null; } },
    { id: 'R4-DATA-05', label: 'semantic invalid date', mutate: (body: Record<string, unknown>) => { body.date = '2026-02-30'; } },
    { id: 'R4-DATA-06', label: 'datetime instead of date', mutate: (body: Record<string, unknown>) => { body.date = '2026-10-16T12:30:00Z'; } },
    { id: 'R4-DATA-07', label: 'malformed category UUID', mutate: (body: Record<string, unknown>) => { body.categoryId = 'not-a-uuid'; } },
    { id: 'R4-DATA-08', label: 'array description', mutate: (body: Record<string, unknown>) => { body.description = ['QA']; } },
    { id: 'R4-DATA-09', label: 'boolean description', mutate: (body: Record<string, unknown>) => { body.description = false; } },
    { id: 'R4-DATA-11', label: 'undocumented currency field', mutate: (body: Record<string, unknown>) => { body.currency = 'ZZZ'; } },
  ]) {
    test(`${scenario.id} rejects ${scenario.label} without 5xx`, async ({ auth, http }) => {
      const employee = await auth.loginAs('employee2');
      const body = new ExpenseBuilder()
        .withDescription(`${scenario.id} ${Date.now()}`)
        .build() as Record<string, unknown>;
      scenario.mutate(body);
      const response = await http.post('/api/v1/expenses', body, employee.accessToken);
      await clientError(response, scenario.id);
    });
  }

  for (const scenario of [
    { id: 'R4-QUERY-01', query: '?page=1.5', label: 'fractional page' },
    { id: 'R4-QUERY-02', query: '?page=2147483648', label: 'page over int32' },
    { id: 'R4-QUERY-03', query: '?pageSize=1.5', label: 'fractional page size' },
  ]) {
    test(`${scenario.id} rejects ${scenario.label} deterministically`, async ({ auth, expenses }) => {
      const employee = await auth.loginAs('employee1');
      const response = await expenses.list(employee.accessToken, scenario.query);
      await clientError(response, scenario.id);
    });
  }

  for (const scenario of [
    { id: 'R4-QUERY-04', query: '?page=1&page=2', label: 'duplicate page parameter' },
    { id: 'R4-QUERY-05', query: '?status=Approved&status=Rejected', label: 'duplicate status parameter' },
    { id: 'R4-QUERY-06', query: '?unknownParameter=true', label: 'undocumented query parameter' },
  ]) {
    test(`${scenario.id} handles ${scenario.label} without server error`, async ({ auth, expenses }) => {
      const employee = await auth.loginAs('employee1');
      const response = await expenses.list(employee.accessToken, scenario.query);
      expect(response.status(), `${scenario.id}: server error`).toBeLessThan(500);
    });
  }

  test('R4-VALID-01 accepts nullable categoryId as documented', async ({ auth, expenses }) => {
    const employee = await auth.loginAs('employee2');
    const body = new ExpenseBuilder().withDescription(`R4 nullable category ${Date.now()}`).build();
    body.categoryId = null;
    const response = await expenses.create(employee.accessToken, body);
    expect(response.status(), await response.text()).toBe(201);
    expect((await response.json()).categoryId).toBeNull();
  });

  test('R4-VALID-02 accepts Unicode text and NUL as schema-unconstrained strings', async ({ auth, expenses }) => {
    const employee = await auth.loginAs('employee2');
    const description = `R4 Unicode café Καλημέρα 日本語 🧾 NUL\u0000end ${Date.now()}`;
    const response = await expenses.create(employee.accessToken, new ExpenseBuilder().withDescription(description).build());
    expect(response.status(), await response.text()).toBe(201);
    expect((await response.json()).description).toBe(description);
  });

  test('R4-DATA-13 preserves safe Unicode without normalization loss', async ({ auth, expenses }) => {
    const employee = await auth.loginAs('employee2');
    const description = `R4 Unicode café Καλημέρα 日本語 🧾 ${Date.now()}`;
    const created = await expenses.create(employee.accessToken, new ExpenseBuilder().withDescription(description).build());
    expect(created.status(), await created.text()).toBe(201);
    expect((await created.json()).description).toBe(description);
  });

  test('R4-HTTP-01 rejects JSON body sent as text/plain', async ({ auth }) => {
    const employee = await auth.loginAs('employee2');
    const context = await rawContext();
    try {
      const response = await context.post('/api/v1/expenses', {
        data: JSON.stringify(new ExpenseBuilder().withDescription(`R4 text plain ${Date.now()}`).build()),
        headers: { Authorization: `Bearer ${employee.accessToken}`, 'Content-Type': 'text/plain' },
      });
      expect([400, 415], await response.text()).toContain(response.status());
    } finally {
      await context.dispose();
    }
  });

  test('R4-HTTP-02 rejects malformed JSON as a client error', async ({ auth }) => {
    const employee = await auth.loginAs('employee2');
    const context = await rawContext();
    try {
      const response = await context.post('/api/v1/expenses', {
        data: '{"description":"R4 malformed",',
        headers: { Authorization: `Bearer ${employee.accessToken}`, 'Content-Type': 'application/json' },
      });
      await clientError(response, 'R4-HTTP-02');
    } finally {
      await context.dispose();
    }
  });

  test('R4-HTTP-03 unsupported PATCH cannot mutate the expenses collection', async ({ auth }) => {
    const employee = await auth.loginAs('employee2');
    const context = await rawContext();
    try {
      const response = await context.patch('/api/v1/expenses', {
        data: new ExpenseBuilder().withDescription(`R4 patch ${Date.now()}`).build(),
        headers: { Authorization: `Bearer ${employee.accessToken}` },
      });
      expect([404, 405], await response.text()).toContain(response.status());
    } finally {
      await context.dispose();
    }
  });
});

async function rawContext(): Promise<APIRequestContext> {
  const context = await request.newContext({
    baseURL: environment.apiUrl,
    ignoreHTTPSErrors: true,
    httpCredentials: { username: environment.proxyUser(), password: environment.proxyPassword() },
    extraHTTPHeaders: { Accept: 'application/json' },
  });
  const gate = await context.get('/__gate', { maxRedirects: 0 });
  if (gate.status() !== 302) {
    await context.dispose();
    throw new Error(`Environment gate returned ${gate.status()}`);
  }
  return context;
}
