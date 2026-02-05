import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
/** Global exception filter - ensures centralized error format in all responses */
export declare class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: unknown, host: ArgumentsHost): void;
    private normalize;
}
//# sourceMappingURL=http-exception.filter.d.ts.map