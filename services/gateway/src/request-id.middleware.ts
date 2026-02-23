import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

const HEADER = 'x-request-id';

export function requestId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id = (req.get(HEADER) as string)?.trim() || randomUUID();
  req.requestId = id;
  res.setHeader(HEADER, id);
  next();
}
