import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { ProcessedEventEntity } from './entities/processed-event.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { ProcessedEventsRepository } from './processed-events.repository';
import { OrderEventsPublisher } from '../events/order-events.publisher';
import { PaymentCompletedConsumer } from './payment-completed.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OrderItemEntity, ProcessedEventEntity]),
    HttpModule.register({ timeout: 5000 }),
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersRepository,
    ProcessedEventsRepository,
    OrderEventsPublisher,
    PaymentCompletedConsumer,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
