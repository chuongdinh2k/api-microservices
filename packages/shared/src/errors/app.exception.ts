import { HttpException, HttpStatus } from '@nestjs/common';

/** Centralized error format - same shape across all services */
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path?: string;
}

/** Base app exception - use for domain/validation errors */
export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: number = HttpStatus.BAD_REQUEST,
    public readonly code?: string,
  ) {
    super(
      { message, code },
      statusCode,
    );
  }
}

export class NotFoundException extends AppException {
  constructor(message: string = 'Resource not found', code?: string) {
    super(message, HttpStatus.NOT_FOUND, code ?? 'NOT_FOUND');
  }
}

export class ConflictException extends AppException {
  constructor(message: string = 'Resource already exists', code?: string) {
    super(message, HttpStatus.CONFLICT, code ?? 'CONFLICT');
  }
}

export class UnauthorizedException extends AppException {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(message, HttpStatus.UNAUTHORIZED, code ?? 'UNAUTHORIZED');
  }
}

export class ForbiddenException extends AppException {
  constructor(message: string = 'Forbidden', code?: string) {
    super(message, HttpStatus.FORBIDDEN, code ?? 'FORBIDDEN');
  }
}
