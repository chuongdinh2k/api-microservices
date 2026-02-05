import { Controller, All, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

@Controller()
export class ProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'gateway' };
  }

  @All('auth*')
  auth(@Req() req: Request, @Res() res: Response) {
    return this.forward('auth', req, res);
  }

  @All('users*')
  users(@Req() req: Request, @Res() res: Response) {
    return this.forward('user', req, res);
  }

  @All('products*')
  products(@Req() req: Request, @Res() res: Response) {
    return this.forward('product', req, res);
  }

  @All('orders*')
  orders(@Req() req: Request, @Res() res: Response) {
    return this.forward('order', req, res);
  }

  private async forward(service: string, req: Request, res: Response) {
    const path = req.path;
    const result = await this.proxy.proxy(service, path, req) as { _status?: number; _data?: unknown };
    const status = result._status ?? 200;
    const data = result._data;
    res.status(status);
    if (data !== undefined) res.json(data);
    else res.end();
  }
}
