import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../products/entities/product.entity';
import { ReservationEntity } from './entities/reservation.entity';
import { ProcessedEventEntity } from './entities/processed-event.entity';
import { InventoryRepository } from './inventory.repository';
import { OrderCreatedConsumer } from './order-created.consumer';
import { PaymentFailedConsumer } from './payment-failed.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, ReservationEntity, ProcessedEventEntity]),
  ],
  providers: [InventoryRepository, OrderCreatedConsumer, PaymentFailedConsumer],
})
export class InventoryModule {}
