// Errors - centralized format
export {
  AppException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  type ErrorResponse,
} from './errors/app.exception';
export { AllExceptionsFilter } from './errors/http-exception.filter';

// Logger
export { PinoLoggerService } from './logger/logger.service';

// Events (RabbitMQ)
export {
  EXCHANGE,
  DLX_EXCHANGE,
  ROUTING_KEYS,
  type OrderCreatedPayload,
  type PaymentCompletedPayload,
  type PaymentFailedPayload,
} from './events/order.events';
