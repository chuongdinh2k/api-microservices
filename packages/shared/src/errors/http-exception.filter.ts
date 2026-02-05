import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse } from './app.exception';

/** Global exception filter - ensures centralized error format in all responses */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, body } = this.normalize(exception, request);

    this.logger.warn(
      { err: exception, path: request.url, statusCode },
      body.message,
    );

    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown, request: Request): { statusCode: number; body: ErrorResponse } {
    const timestamp = new Date().toISOString();
    const path = request.url;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message = typeof res === 'object' && res !== null && 'message' in res
        ? (Array.isArray((res as { message: unknown }).message)
            ? (res as { message: string[] }).message.join(', ')
            : (res as { message: string }).message)
        : exception.message;
      return {
        statusCode: status,
        body: {
          statusCode: status,
          error: (exception as { name?: string }).name ?? 'HttpException',
          message,
          timestamp,
          path,
        },
      };
    }

    const isError = exception instanceof Error;
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: isError ? exception.message : 'Unknown error',
        timestamp,
        path,
      },
    };
  }
}
