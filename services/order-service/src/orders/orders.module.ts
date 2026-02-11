import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { ProcessedEventEntity } from './entities/processed-event.entity';
import { OutboxEntity } from './entities/outbox.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { OutboxRepository } from './outbox.repository';
import { ProcessedEventsRepository } from './processed-events.repository';
import { OrderEventsPublisher } from '../events/order-events.publisher';
import { OutboxPublisher } from '../events/outbox.publisher';
import { PaymentCompletedConsumer } from './payment-completed.consumer';
import { InventoryReservationFailedConsumer } from './inventory-reservation-failed.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OrderItemEntity, ProcessedEventEntity, OutboxEntity]),
    HttpModule.register({ timeout: 5000 }),
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersRepository,
    OutboxRepository,
    ProcessedEventsRepository,
    OrderEventsPublisher,
    OutboxPublisher,
    PaymentCompletedConsumer,
    InventoryReservationFailedConsumer,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
