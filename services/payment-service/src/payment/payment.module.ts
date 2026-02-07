import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessedEventEntity } from './entities/processed-event.entity';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentRepository } from './payment.repository';
import { OrderCreatedConsumer } from './order-created.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProcessedEventEntity, PaymentEntity]),
  ],
  providers: [PaymentRepository, OrderCreatedConsumer],
})
export class PaymentModule {}
