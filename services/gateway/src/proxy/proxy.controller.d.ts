import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
export declare class ProxyController {
    private readonly proxy;
    constructor(proxy: ProxyService);
    health(): {
        status: string;
        service: string;
    };
    auth(req: Request, res: Response): Promise<void>;
    users(req: Request, res: Response): Promise<void>;
    products(req: Request, res: Response): Promise<void>;
    orders(req: Request, res: Response): Promise<void>;
    private forward;
}
//# sourceMappingURL=proxy.controller.d.ts.map