import { LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';

const SERVICE_NAME =
  process.env.SERVICE_NAME ?? process.env.NODE_SERVICE_NAME ?? 'unknown';

/** Use pretty (human-readable) output only in dev or when LOG_PRETTY=true; JSON in production for ELK */
const usePretty =
  process.env.LOG_PRETTY === 'true' || process.env.NODE_ENV !== 'production';

/** Structured logging - same format across services for aggregation/querying */
export class PinoLoggerService implements NestLoggerService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly context?: string,
    options?: pino.LoggerOptions,
  ) {
    const level = process.env.LOG_LEVEL ?? 'info';
    const base = { service: SERVICE_NAME };
    const formatters = {
      level: (label: string) => ({ level: label }),
    };

    this.logger = usePretty
      ? pino(
          {
            level,
            base,
            formatters,
            ...options,
          },
          pino.transport({
            target: 'pino-pretty',
            options: { colorize: true },
          }),
        )
      : pino({
          level,
          base,
          formatters,
          ...options,
        });
  }

  log(message: string, ...optionalParams: unknown[]) {
    this.logger.info({ context: this.context, extra: optionalParams }, message);
  }

  error(message: string, ...optionalParams: unknown[]) {
    this.logger.error({ context: this.context, extra: optionalParams }, message);
  }

  warn(message: string, ...optionalParams: unknown[]) {
    this.logger.warn({ context: this.context, extra: optionalParams }, message);
  }

  debug(message: string, ...optionalParams: unknown[]) {
    this.logger.debug({ context: this.context, extra: optionalParams }, message);
  }

  verbose(message: string, ...optionalParams: unknown[]) {
    this.logger.trace({ context: this.context, extra: optionalParams }, message);
  }

  /** Log with custom top-level fields (e.g. for request logs: method, path, statusCode). */
  logWith(obj: Record<string, unknown>, message: string): void {
    this.logger.info({ ...obj, context: this.context }, message);
  }
}
