import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        // url: process.env.DATABASE_URL,
        url: process.env.PRODUCT_DB_URL,
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    ProductsModule,
    InventoryModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
