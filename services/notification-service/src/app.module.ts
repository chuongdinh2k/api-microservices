import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        // url: process.env.DATABASE_URL,
        url: process.env.NOTIFICATION_DB_URL,
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    NotificationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
