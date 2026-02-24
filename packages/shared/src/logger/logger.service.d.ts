import { LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';
/** Structured logging - same format across services for aggregation/querying */
export declare class PinoLoggerService implements NestLoggerService {
    private readonly context?;
    private readonly logger;
    constructor(context?: string | undefined, options?: pino.LoggerOptions);
    log(message: string, ...optionalParams: unknown[]): void;
    error(message: string, ...optionalParams: unknown[]): void;
    warn(message: string, ...optionalParams: unknown[]): void;
    debug(message: string, ...optionalParams: unknown[]): void;
    verbose(message: string, ...optionalParams: unknown[]): void;
    logWith(obj: Record<string, unknown>, message: string): void;
}
//# sourceMappingURL=logger.service.d.ts.map