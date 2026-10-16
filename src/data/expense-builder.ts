export interface ExpenseInput {
  description: string; amount: number; date: string; vendor?: string | null; categoryId?: string | null;
  notes?: string | null; receiptUrl?: string | null; [key: string]: unknown;
}

export class ExpenseBuilder {
  private value: ExpenseInput = {
    description: `QA expense ${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    amount: 10,
    date: new Date().toISOString().slice(0, 10),
  };
  withDescription(value: string) { this.value.description = value; return this; }
  withAmount(value: number) { this.value.amount = value; return this; }
  withDate(value: string) { this.value.date = value; return this; }
  withVendor(value: string) { this.value.vendor = value; return this; }
  withNotes(value: string) { this.value.notes = value; return this; }
  withCategory(value: string) { this.value.categoryId = value; return this; }
  withReceipt(value: string) { this.value.receiptUrl = value; return this; }
  withClientControlled(field: string, value: unknown) { this.value[field] = value; return this; }
  build(): ExpenseInput { return structuredClone(this.value); }
}
