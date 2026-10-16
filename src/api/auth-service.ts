import { APIResponse } from '@playwright/test';
import { HttpClient } from './http-client.js';
import { environment, TestRole } from '../config/environment.js';

export interface Session {
  accessToken: string;
  expiresAt: string;
  user: { id: string; email: string; fullName: string; roles: string[]; managerId: string | null };
}

export class AuthService {
  constructor(private readonly http: HttpClient) {}
  loginResponse(email: string, password: string): Promise<APIResponse> { return this.http.post('/api/v1/auth/login', { email, password }); }
  async loginAs(role: TestRole): Promise<Session> {
    const response = await this.loginResponse(environment.email(role), environment.seedPassword());
    if (response.status() !== 200) throw new Error(`Login failed for ${role}: ${response.status()}`);
    return response.json() as Promise<Session>;
  }
  me(token: string) { return this.http.get('/api/v1/auth/me', token); }
  logout(token: string) { return this.http.post('/api/v1/auth/logout', undefined, token); }
}
