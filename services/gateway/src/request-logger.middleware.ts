import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

const logger = new Logger('Gateway');

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();
  const method = req.method;
  const path = req.originalUrl ?? req.url;
  const ip = (req.get('x-forwarded-for') ?? req.socket?.remoteAddress ?? 'unknown')
    .toString()
    .split(',')[0]
    .trim();
  const userAgent = req.get('user-agent') ?? '-';
  const requestId = req.requestId ?? '-';

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const statusCode = res.statusCode;
    const userId = req.user?.sub ?? '-';
    logger.log(
      `${method} ${path} ${statusCode} ${durationMs}ms - requestId=${requestId} userId=${userId} ip=${ip} - ${userAgent}`,
    );
  });

  next();
}
