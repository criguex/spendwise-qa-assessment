import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const requiredOperations = [
  ['post', '/api/v1/auth/login'], ['get', '/api/v1/auth/me'], ['post', '/api/v1/auth/logout'],
  ['get', '/api/v1/categories'], ['get', '/api/v1/expenses'], ['post', '/api/v1/expenses'],
  ['get', '/api/v1/expenses/{id}'], ['delete', '/api/v1/expenses/{id}'],
  ['get', '/api/v1/expenses/{id}/history'], ['get', '/api/v1/approvals/pending'],
  ['put', '/api/v1/approvals/{id}/approve'], ['put', '/api/v1/approvals/{id}/reject'],
  ['get', '/api/v1/policies'], ['post', '/api/v1/policies'], ['put', '/api/v1/policies/{id}'],
  ['delete', '/api/v1/policies/{id}'], ['get', '/api/v1/reports'], ['get', '/api/v1/dashboard/summary'],
] as const;

test.describe('OpenAPI structure', () => {
  test('CON-01 @smoke exposes every required operation', async () => {
    const spec = JSON.parse(await readFile('openapi/spendwise-openapi.json', 'utf8'));
    for (const [method, path] of requiredOperations) expect(spec.paths[path]?.[method], `${method.toUpperCase()} ${path}`).toBeDefined();
  });

  test('CON-02 every operation declares at least one response', async () => {
    const spec = JSON.parse(await readFile('openapi/spendwise-openapi.json', 'utf8'));
    for (const [path, pathItem] of Object.entries<any>(spec.paths)) {
      for (const [method, operation] of Object.entries<any>(pathItem)) {
        expect(Object.keys(operation.responses ?? {}).length, `${method.toUpperCase()} ${path}`).toBeGreaterThan(0);
      }
    }
  });

  test('CON-03 documents security and negative response contracts', async () => {
    const spec = JSON.parse(await readFile('openapi/spendwise-openapi.json', 'utf8'));
    expect(Object.keys(spec.components?.securitySchemes ?? {}), 'Bearer security scheme').not.toHaveLength(0);
    const protectedOperations = requiredOperations.filter(([, path]) => path !== '/api/v1/auth/login');
    for (const [method, path] of protectedOperations) {
      const responses = spec.paths[path][method].responses;
      expect(responses['401'], `${method.toUpperCase()} ${path} should document 401`).toBeDefined();
    }
  });
});
