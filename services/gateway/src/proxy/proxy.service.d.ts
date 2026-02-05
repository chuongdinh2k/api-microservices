import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Request } from 'express';
export declare class ProxyService {
    private readonly http;
    private readonly config;
    constructor(http: HttpService, config: ConfigService);
    private baseUrls;
    proxy(service: string, path: string, req: Request): Promise<unknown>;
}
//# sourceMappingURL=proxy.service.d.ts.map