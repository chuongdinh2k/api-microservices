import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter, PinoLoggerService } from '@ecommerce/shared';
import { requestId } from './request-id.middleware';
import { requestLogger } from './request-logger.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(PinoLoggerService));
  app.use(requestId);
  app.use(requestLogger(app.get(PinoLoggerService)));
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = Number(process.env.GATEWAY_PORT ?? process.env.PORT ?? 3000);
  await app.listen(port);
  app.get(PinoLoggerService).log(`Gateway listening on port ${port}`);
}
bootstrap();
