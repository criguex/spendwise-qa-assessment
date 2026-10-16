import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid(), email: z.string().email(), fullName: z.string().min(1),
  roles: z.array(z.enum(['Employee', 'Manager', 'FinanceController', 'Administrator'])).min(1),
  managerId: z.string().uuid().nullable(),
});
export const loginSchema = z.object({ accessToken: z.string().min(20), expiresAt: z.string(), user: userSchema });
export const expenseSchema = z.object({
  id: z.string().uuid(), expenseNumber: z.string().regex(/^EXP-\d{4}-\d{4,}$/), description: z.string(),
  vendor: z.string().nullable(), amount: z.number(), date: z.string(), categoryId: z.string().uuid().nullable(),
  categoryName: z.string().nullable(),
  status: z.enum(['AutoApproved', 'PendingApproval', 'Approved', 'Rejected', 'Pending', 'PendingFinance']),
  notes: z.string().nullable(), receiptUrl: z.string().nullable(), createdAt: z.string(),
});
export const expenseListSchema = z.object({
  items: z.array(expenseSchema), totalCount: z.number().int().nonnegative(),
  page: z.number().int().positive(), pageSize: z.number().int().positive(),
});
export const categorySchema = z.object({
  id: z.string().uuid(), name: z.string().min(1), icon: z.string().min(1), description: z.string().min(1),
});
