import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@ecommerce/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = Number(process.env.GATEWAY_PORT ?? process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Gateway listening on port ${port}`);
}
bootstrap();
