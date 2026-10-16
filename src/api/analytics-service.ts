import { HttpClient } from './http-client.js';

export class AnalyticsService {
  constructor(private readonly http: HttpClient) {}
  dashboard(token: string) { return this.http.get('/api/v1/dashboard/summary', token); }
  reports(token: string, query = '') { return this.http.get(`/api/v1/reports${query}`, token); }
}
