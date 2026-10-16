import { HttpClient } from './http-client.js';
export class ApprovalService {
  constructor(private readonly http: HttpClient) {}
  pending(token: string) { return this.http.get('/api/v1/approvals/pending', token); }
  approve(token: string, id: string) { return this.http.put(`/api/v1/approvals/${id}/approve`, undefined, token); }
  reject(token: string, id: string, reason: string) { return this.http.put(`/api/v1/approvals/${id}/reject`, { reason }, token); }
}
