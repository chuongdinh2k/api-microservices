import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import {
  EXCHANGE,
  DLX_EXCHANGE,
  ROUTING_KEYS,
  type PaymentCompletedPayload,
} from '@ecommerce/shared';
import { OrdersRepository } from './orders.repository';
import { ProcessedEventsRepository } from './processed-events.repository';

interface AmqpConnection {
  createChannel(): Promise<amqp.Channel>;
  close(): Promise<void>;
}

const QUEUE = 'order.payment-completed';
const DLQ = 'order.payment-completed.dlq';
const MAX_RETRIES = 3;
const RETRY_HEADER = 'x-retry-count';

@Injectable()
export class PaymentCompletedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentCompletedConsumer.name);
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly ordersRepo: OrdersRepository,
    private readonly processedRepo: ProcessedEventsRepository,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) {
      this.logger.warn('RABBITMQ_URL not set; payment.completed consumer not started');
      return;
    }
    try {
      this.connection = (await amqp.connect(url)) as unknown as AmqpConnection;
      this.channel = await this.connection.createChannel();
      await this.channel.prefetch(1);

      await this.channel.assertExchange(DLX_EXCHANGE, 'topic', { durable: true });
      await this.channel.assertQueue(DLQ, { durable: true });
      await this.channel.bindQueue(DLQ, DLX_EXCHANGE, DLQ);

      await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      await this.channel.assertQueue(QUEUE, {
        durable: true,
        deadLetterExchange: DLX_EXCHANGE,
        deadLetterRoutingKey: DLQ,
      });
      await this.channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEYS.PAYMENT_COMPLETED);

      await this.channel.consume(QUEUE, (msg) => this.handleMessage(msg));
      this.logger.log('PaymentCompleted consumer started');
    } catch (err) {
      this.logger.error('Failed to start payment.completed consumer', err);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch (_) {}
    this.channel = null;
    this.connection = null;
  }

  private async handleMessage(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) return;
    const retryCount = (msg.properties.headers?.[RETRY_HEADER] as number) ?? 0;
    console.log('order-service payment-completed payload', msg.content.toString());
    try {
      const payload = JSON.parse(msg.content.toString()) as PaymentCompletedPayload;
      const eventId = payload.eventId ?? msg.properties.messageId;

      if (!eventId) {
        this.logger.warn('Message without eventId, nacking to DLQ');
        this.channel.nack(msg, false, false);
        return;
      }

      if (await this.processedRepo.isProcessed(eventId)) {
        this.logger.log(`Idempotency: eventId=${eventId} already processed, ack`);
        this.channel.ack(msg);
        return;
      }

      await this.ordersRepo.updateStatus(payload.orderId, 'confirmed');
      await this.processedRepo.markProcessed(eventId, 'payment.completed');
      this.logger.log(`Order ${payload.orderId} status updated to confirmed (paymentId=${payload.paymentId})`);
      this.channel.ack(msg);
    } catch (err) {
      this.logger.warn(`Process error (retry ${retryCount}/${MAX_RETRIES}):`, err);
      if (retryCount < MAX_RETRIES) {
        this.channel.sendToQueue(QUEUE, msg.content, {
          persistent: true,
          contentType: msg.properties.contentType ?? 'application/json',
          messageId: msg.properties.messageId,
          headers: { ...msg.properties.headers, [RETRY_HEADER]: retryCount + 1 },
        });
        this.channel.ack(msg);
      } else {
        this.logger.error(`Max retries reached, sending to DLQ`);
        this.channel.nack(msg, false, false);
      }
    }
  }
}
