import { Request, Response, NextFunction } from 'express';
import { PinoLoggerService } from '@ecommerce/shared';

export function requestLogger(logger: PinoLoggerService) {
  return (req: Request, res: Response, next: NextFunction): void => {
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
      logger.logWith(
        {
          method,
          path,
          statusCode,
          durationMs,
          requestId,
          userId,
          ip,
          userAgent,
        },
        'request',
      );
    });

    next();
  };
}
