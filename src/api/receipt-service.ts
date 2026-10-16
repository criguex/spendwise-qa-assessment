import { HttpClient } from './http-client.js';

export class ReceiptService {
  constructor(private readonly http: HttpClient) {}
  extract(token: string | undefined, file: { name: string; mimeType: string; buffer: Buffer }) {
    return this.http.postMultipart('/api/v1/receipts/extract', { file }, token);
  }
}
