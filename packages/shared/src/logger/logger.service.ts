import { LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';

/** Structured logging - same format across services for aggregation/querying */
export class PinoLoggerService implements NestLoggerService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly context?: string,
    options?: pino.LoggerOptions,
  ) {
    this.logger = pino({
      level: process.env.LOG_LEVEL ?? 'info',
      formatters: {
        level: (label) => ({ level: label }),
      },
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
}
