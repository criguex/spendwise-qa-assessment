import { HttpClient } from './http-client.js';
import { ExpenseInput } from '../data/expense-builder.js';

export class ExpenseService {
  constructor(private readonly http: HttpClient) {}
  list(token: string, query = '') { return this.http.get(`/api/v1/expenses${query}`, token); }
  get(token: string, id: string) { return this.http.get(`/api/v1/expenses/${id}`, token); }
  history(token: string, id: string) { return this.http.get(`/api/v1/expenses/${id}/history`, token); }
  create(token: string, input: ExpenseInput) { return this.http.post('/api/v1/expenses', input, token); }
  remove(token: string, id: string) { return this.http.delete(`/api/v1/expenses/${id}`, token); }
}
