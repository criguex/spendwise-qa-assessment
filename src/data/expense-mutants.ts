import type { ExpenseInput } from './expense-builder.js';

export type ExpenseMutant = {
  id: string;
  operator: 'delete' | 'replace' | 'boundary' | 'type' | 'reference' | 'trust-boundary';
  field: keyof ExpenseInput;
  description: string;
  expectedStatus: number;
  mutate: (valid: ExpenseInput) => Record<string, unknown>;
};

const replace = (field: keyof ExpenseInput, value: unknown) => (valid: ExpenseInput) => ({ ...valid, [field]: value });
const remove = (field: keyof ExpenseInput) => (valid: ExpenseInput) => {
  const mutant: Record<string, unknown> = { ...valid };
  delete mutant[field];
  return mutant;
};

export const expenseMutants: readonly ExpenseMutant[] = [
  { id: 'MUT-EXP-01', operator: 'delete', field: 'description', description: 'remove required description', expectedStatus: 400, mutate: remove('description') },
  { id: 'MUT-EXP-02', operator: 'replace', field: 'description', description: 'replace description with whitespace', expectedStatus: 400, mutate: replace('description', '   ') },
  { id: 'MUT-EXP-03', operator: 'replace', field: 'description', description: 'replace description with null', expectedStatus: 400, mutate: replace('description', null) },
  { id: 'MUT-EXP-04', operator: 'type', field: 'description', description: 'replace description with an object', expectedStatus: 400, mutate: replace('description', { text: 'invalid' }) },
  { id: 'MUT-EXP-05', operator: 'boundary', field: 'description', description: 'exceed description maximum by one', expectedStatus: 400, mutate: replace('description', 'x'.repeat(501)) },
  { id: 'MUT-EXP-06', operator: 'delete', field: 'amount', description: 'remove required amount', expectedStatus: 400, mutate: remove('amount') },
  { id: 'MUT-EXP-07', operator: 'boundary', field: 'amount', description: 'replace amount with zero', expectedStatus: 400, mutate: replace('amount', 0) },
  { id: 'MUT-EXP-08', operator: 'boundary', field: 'amount', description: 'replace amount with a negative value', expectedStatus: 400, mutate: replace('amount', -0.01) },
  { id: 'MUT-EXP-09', operator: 'boundary', field: 'amount', description: 'use more than two decimal places', expectedStatus: 400, mutate: replace('amount', 1.001) },
  { id: 'MUT-EXP-10', operator: 'type', field: 'amount', description: 'replace amount with a numeric string', expectedStatus: 400, mutate: replace('amount', '10.00') },
  { id: 'MUT-EXP-11', operator: 'delete', field: 'date', description: 'remove required date', expectedStatus: 400, mutate: remove('date') },
  { id: 'MUT-EXP-12', operator: 'replace', field: 'date', description: 'replace date with an empty string', expectedStatus: 400, mutate: replace('date', '') },
  { id: 'MUT-EXP-13', operator: 'replace', field: 'date', description: 'replace date with malformed text', expectedStatus: 400, mutate: replace('date', 'not-a-date') },
  { id: 'MUT-EXP-14', operator: 'type', field: 'date', description: 'replace date with a number', expectedStatus: 400, mutate: replace('date', 20261016) },
  { id: 'MUT-EXP-15', operator: 'reference', field: 'categoryId', description: 'reference a nonexistent category', expectedStatus: 400, mutate: replace('categoryId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') },
  { id: 'MUT-EXP-16', operator: 'trust-boundary', field: 'receiptUrl', description: 'forge a receipt URL without uploading a file', expectedStatus: 400, mutate: valid => ({ ...valid, amount: 30, receiptUrl: 'https://example.invalid/forged-receipt.pdf' }) },
] as const;

export function buildExpenseMutant(mutant: ExpenseMutant, valid: ExpenseInput): Record<string, unknown> {
  return mutant.mutate(structuredClone(valid));
}
