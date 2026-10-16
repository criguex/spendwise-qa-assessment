export type ApiMutant = {
  id: string;
  module: 'auth' | 'expenses' | 'approvals' | 'policies' | 'reports' | 'receipts';
  operator: 'delete' | 'replace' | 'boundary' | 'type' | 'authorization' | 'encoding';
  description: string;
  expectedStatus: number;
};

export const apiMutants = [
  { id: 'MUT-AUTH-01', module: 'auth', operator: 'delete', description: 'missing email', expectedStatus: 400 },
  { id: 'MUT-AUTH-02', module: 'auth', operator: 'delete', description: 'missing password', expectedStatus: 400 },
  { id: 'MUT-AUTH-03', module: 'auth', operator: 'type', description: 'array replaces email', expectedStatus: 400 },
  { id: 'MUT-AUTH-04', module: 'auth', operator: 'replace', description: 'email surrounded by whitespace', expectedStatus: 401 },
  { id: 'MUT-EXPQ-01', module: 'expenses', operator: 'boundary', description: 'page zero', expectedStatus: 400 },
  { id: 'MUT-EXPQ-02', module: 'expenses', operator: 'boundary', description: 'negative page', expectedStatus: 400 },
  { id: 'MUT-EXPQ-03', module: 'expenses', operator: 'type', description: 'nonnumeric page', expectedStatus: 400 },
  { id: 'MUT-EXPQ-04', module: 'expenses', operator: 'boundary', description: 'page size zero', expectedStatus: 400 },
  { id: 'MUT-EXPQ-05', module: 'expenses', operator: 'boundary', description: 'page size exceeds maximum', expectedStatus: 400 },
  { id: 'MUT-EXPQ-06', module: 'expenses', operator: 'replace', description: 'unknown status', expectedStatus: 400 },
  { id: 'MUT-EXPQ-07', module: 'expenses', operator: 'replace', description: 'unknown category', expectedStatus: 400 },
  { id: 'MUT-EXPQ-08', module: 'expenses', operator: 'encoding', description: 'encoded control characters in search', expectedStatus: 400 },
  { id: 'MUT-APR-01', module: 'approvals', operator: 'replace', description: 'malformed approval id', expectedStatus: 400 },
  { id: 'MUT-APR-02', module: 'approvals', operator: 'delete', description: 'missing rejection reason', expectedStatus: 400 },
  { id: 'MUT-APR-03', module: 'approvals', operator: 'replace', description: 'blank rejection reason', expectedStatus: 400 },
  { id: 'MUT-POL-01', module: 'policies', operator: 'authorization', description: 'Finance attempts policy creation', expectedStatus: 403 },
  { id: 'MUT-POL-02', module: 'policies', operator: 'authorization', description: 'Employee attempts policy creation', expectedStatus: 403 },
  { id: 'MUT-POL-03', module: 'policies', operator: 'type', description: 'string replaces boolean flag', expectedStatus: 400 },
  { id: 'MUT-POL-04', module: 'policies', operator: 'delete', description: 'missing action', expectedStatus: 400 },
  { id: 'MUT-REP-01', module: 'reports', operator: 'boundary', description: 'reversed date range', expectedStatus: 400 },
  { id: 'MUT-REP-02', module: 'reports', operator: 'replace', description: 'unknown category filter', expectedStatus: 400 },
  { id: 'MUT-REP-03', module: 'reports', operator: 'replace', description: 'unknown status filter', expectedStatus: 400 },
  { id: 'MUT-REC-01', module: 'receipts', operator: 'boundary', description: 'empty receipt file', expectedStatus: 400 },
  { id: 'MUT-REC-02', module: 'receipts', operator: 'replace', description: 'executable bytes disguised as PDF', expectedStatus: 400 },
] as const satisfies readonly ApiMutant[];

export function expectedStatus(id: string): number {
  const mutant = apiMutants.find(candidate => candidate.id === id);
  if (!mutant) throw new Error(`Unknown API mutant: ${id}`);
  return mutant.expectedStatus;
}
