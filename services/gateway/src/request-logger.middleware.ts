import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

const logger = new Logger('Gateway');

export function requestLogger(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const method = req.method;
  const path = req.originalUrl ?? req.url;
  const ip = (req.get('x-forwarded-for') ?? req.socket?.remoteAddress ?? 'unknown').toString().split(',')[0].trim();
  const userAgent = req.get('user-agent') ?? '-';
  logger.log(`${method} ${path} - ip=${ip} - ${userAgent}`);
  next();
}
