import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter, PinoLoggerService } from '@ecommerce/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(PinoLoggerService));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  const logger = app.get(PinoLoggerService);
  logger.log(`Auth service listening on port ${port}`);
  logger.log(`Auth database URL: ${process.env.AUTH_DB_URL}`);
}
bootstrap();
