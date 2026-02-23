import { Controller, All, Get, Req, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class ProxyController {
  constructor(private readonly proxy: ProxyService) {}

  @Get('health')
  @SkipThrottle()
  health() {
    return { status: 'ok', service: 'gateway' };
  }

  @All('auth*')
  auth(@Req() req: Request, @Res() res: Response) {
    return this.forward('auth', req, res);
  }

  @All('users*')
  @UseGuards(JwtAuthGuard)
  users(@Req() req: Request, @Res() res: Response) {
    return this.forward('user', req, res);
  }

  @All('products*')
  @UseGuards(JwtAuthGuard)
  products(@Req() req: Request, @Res() res: Response) {
    return this.forward('product', req, res);
  }

  @All('orders*')
  @UseGuards(JwtAuthGuard)
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
