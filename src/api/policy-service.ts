import { HttpClient } from './http-client.js';
export class PolicyService {
  constructor(private readonly http: HttpClient) {}
  list(token: string) { return this.http.get('/api/v1/policies', token); }
  create(token: string, policy: unknown) { return this.http.post('/api/v1/policies', policy, token); }
  update(token: string, id: string, policy: unknown) { return this.http.put(`/api/v1/policies/${id}`, policy, token); }
  remove(token: string, id: string) { return this.http.delete(`/api/v1/policies/${id}`, token); }
}
