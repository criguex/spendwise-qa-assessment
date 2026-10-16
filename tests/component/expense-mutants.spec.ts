import { expect, test } from '@playwright/test';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';
import { buildExpenseMutant, expenseMutants } from '../../src/data/expense-mutants.js';

test.describe('Expense mutation catalogue component', () => {
  test('MUT-CMP-01 catalogue IDs are unique and each mutant changes one valid baseline', () => {
    const ids = expenseMutants.map(mutant => mutant.id);
    expect(new Set(ids).size).toBe(ids.length);
    const baseline = new ExpenseBuilder().build();
    for (const mutant of expenseMutants) expect(buildExpenseMutant(mutant, baseline), mutant.id).not.toEqual(baseline);
  });

  test('MUT-CMP-02 catalogue covers all mutation operator families', () => {
    expect(new Set(expenseMutants.map(mutant => mutant.operator))).toEqual(
      new Set(['delete', 'replace', 'boundary', 'type', 'reference', 'trust-boundary']),
    );
    expect(new Set(expenseMutants.map(mutant => mutant.field))).toEqual(
      new Set(['description', 'amount', 'date', 'categoryId', 'receiptUrl']),
    );
  });
});
