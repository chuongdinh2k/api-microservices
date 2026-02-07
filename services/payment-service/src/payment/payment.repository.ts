import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessedEventEntity } from './entities/processed-event.entity';
import { PaymentEntity } from './entities/payment.entity';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectRepository(ProcessedEventEntity)
    private readonly processedRepo: Repository<ProcessedEventEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
  ) {}

  async isProcessed(eventId: string): Promise<boolean> {
    const one = await this.processedRepo.findOne({ where: { eventId } });
    return !!one;
  }

  async markProcessed(eventId: string, eventType: string): Promise<void> {
    await this.processedRepo.save(
      this.processedRepo.create({ eventId, eventType }),
    );
  }

  async createPayment(orderId: string, eventId: string, amount: string): Promise<PaymentEntity> {
    const payment = this.paymentRepo.create({
      orderId,
      eventId,
      amount,
      status: 'completed',
    });
    return this.paymentRepo.save(payment);
  }
}
