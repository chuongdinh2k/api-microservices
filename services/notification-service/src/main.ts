import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@ecommerce/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = Number(process.env.PORT ?? 3006);
  await app.listen(port);
  console.log(`Notification service listening on port ${port}`);
}
bootstrap();
