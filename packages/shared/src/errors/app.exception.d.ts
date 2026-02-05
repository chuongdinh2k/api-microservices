import { HttpException } from '@nestjs/common';
/** Centralized error format - same shape across all services */
export interface ErrorResponse {
    statusCode: number;
    error: string;
    message: string;
    timestamp: string;
    path?: string;
}
/** Base app exception - use for domain/validation errors */
export declare class AppException extends HttpException {
    readonly code?: string | undefined;
    constructor(message: string, statusCode?: number, code?: string | undefined);
}
export declare class NotFoundException extends AppException {
    constructor(message?: string, code?: string);
}
export declare class ConflictException extends AppException {
    constructor(message?: string, code?: string);
}
export declare class UnauthorizedException extends AppException {
    constructor(message?: string, code?: string);
}
export declare class ForbiddenException extends AppException {
    constructor(message?: string, code?: string);
}
//# sourceMappingURL=app.exception.d.ts.map