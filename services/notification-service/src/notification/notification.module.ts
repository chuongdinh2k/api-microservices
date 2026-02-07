import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessedEventEntity } from './entities/processed-event.entity';
import { NotificationRepository } from './notification.repository';
import { OrderCreatedConsumer } from './order-created.consumer';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessedEventEntity])],
  providers: [NotificationRepository, OrderCreatedConsumer],
})
export class NotificationModule {}
