import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { environment } from '../config/environment.js';

export class HttpClient {
  private context?: APIRequestContext;

  async connect(): Promise<void> {
    this.context = await request.newContext({
      baseURL: environment.apiUrl,
      ignoreHTTPSErrors: true,
      httpCredentials: { username: environment.proxyUser(), password: environment.proxyPassword() },
      extraHTTPHeaders: { Accept: 'application/json' },
    });
    const gate = await this.context.get('/__gate', { maxRedirects: 0 });
    if (gate.status() !== 302) throw new Error(`Environment gate returned ${gate.status()}`);
  }

  async dispose(): Promise<void> { await this.context?.dispose(); }
  get(path: string, token?: string): Promise<APIResponse> { return this.ensure().get(path, { headers: this.auth(token) }); }
  post(path: string, data?: unknown, token?: string): Promise<APIResponse> { return this.ensure().post(path, { data, headers: this.auth(token) }); }
  postMultipart(path: string, multipart: Record<string, string | number | boolean | { name: string; mimeType: string; buffer: Buffer }>, token?: string): Promise<APIResponse> {
    return this.ensure().post(path, { multipart, headers: this.auth(token) });
  }
  put(path: string, data?: unknown, token?: string): Promise<APIResponse> { return this.ensure().put(path, { data, headers: this.auth(token) }); }
  delete(path: string, token?: string): Promise<APIResponse> { return this.ensure().delete(path, { headers: this.auth(token) }); }

  private ensure(): APIRequestContext {
    if (!this.context) throw new Error('HttpClient.connect() must be called first');
    return this.context;
  }
  private auth(token?: string): Record<string, string> { return token ? { Authorization: `Bearer ${token}` } : {}; }
}
