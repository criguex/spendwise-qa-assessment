import { ExpenseBuilder, type ExpenseInput } from '../../src/data/expense-builder.js';
import { buildExpenseMutant, expenseMutants } from '../../src/data/expense-mutants.js';
import { expect, test } from '../fixtures.js';

test.describe('Expense request mutation scenarios', () => {
  for (const mutant of expenseMutants) {
    test(`${mutant.id} @mutation @negative kills mutant: ${mutant.description}`, async ({ auth, expenses }) => {
      const employee = await auth.loginAs('employee3');
      const baseline = new ExpenseBuilder().withDescription(`${mutant.id} ${Date.now()}`).build();
      const payload = buildExpenseMutant(mutant, baseline) as ExpenseInput;
      const response = await expenses.create(employee.accessToken, payload);
      const responseBody = await response.text();

      expect(response.status(), `${mutant.id} survived with ${response.status()}: ${responseBody}`).toBe(mutant.expectedStatus);
      expect(response.status(), `${mutant.id} caused an internal server error`).toBeLessThan(500);
    });
  }
});
