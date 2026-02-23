import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class ProxyService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private baseUrls(): Record<string, string> {
    return {
      auth: this.config.getOrThrow<string>('AUTH_SERVICE_URL'),
      user: this.config.getOrThrow<string>('USER_SERVICE_URL'),
      product: this.config.getOrThrow<string>('PRODUCT_SERVICE_URL'),
      order: this.config.getOrThrow<string>('ORDER_SERVICE_URL'),
      // auth: 'http://localhost:3001',
      // user: 'http://localhost:3002',
      // product: 'http://localhost:3003',
      // order: 'http://localhost:3004',
    };
  }

  async proxy(service: string, path: string, req: Request): Promise<unknown> {
    const base = this.baseUrls()[service];
    if (!base) throw new Error(`Unknown service: ${service}`);
    const url = `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
    const method = (req.method || 'GET').toLowerCase();
    const headers = { ...req.headers } as Record<string, string>;
    delete headers.host;
    delete headers['content-length'];
    delete headers['transfer-encoding'];
    // Central auth: do not forward client token; pass only gateway-verified identity
    delete headers.authorization;
    if (req.requestId) headers['x-request-id'] = req.requestId;
    if (req.user?.sub) headers['x-user-id'] = req.user.sub;

    const res = await firstValueFrom(
      this.http.request({
        url,
        method,
        headers,
        data: req.body,
        validateStatus: () => true,
      }),
    );
    return { _status: res.status, _data: res.data };
  }
}
