import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import {
  EXCHANGE,
  DLX_EXCHANGE,
  ROUTING_KEYS,
  type OrderCreatedPayload,
  type PaymentCompletedPayload,
} from '@ecommerce/shared';
import { PaymentRepository } from './payment.repository';

interface AmqpConnection {
  createChannel(): Promise<amqp.Channel>;
  close(): Promise<void>;
}

const QUEUE = 'payment.orders';
const DLQ = 'payment.dlq';
const MAX_RETRIES = 3;
const RETRY_HEADER = 'x-retry-count';

@Injectable()
export class OrderCreatedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderCreatedConsumer.name);
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly repo: PaymentRepository,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) {
      this.logger.warn('RABBITMQ_URL not set; consumer not started');
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
      await this.channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEYS.ORDER_CREATED);

      await this.channel.consume(QUEUE, (msg) => this.handleMessage(msg));
      this.logger.log('Payment consumer started');
    } catch (err) {
      this.logger.error('Failed to start consumer', err);
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

    try {
      const payload = JSON.parse(msg.content.toString()) as OrderCreatedPayload;
      const eventId = payload.eventId ?? msg.properties.messageId;
      console.log('payload', payload);
      if (!eventId) {
        this.logger.warn('Message without eventId, nacking to DLQ');
        this.channel.nack(msg, false, false);
        return;
      }

      if (await this.repo.isProcessed(eventId)) {
        this.logger.log(`Idempotency: eventId=${eventId} already processed, ack`);
        this.channel.ack(msg);
        return;
      }

      const payment = await this.repo.createPayment(
        payload.orderId,
        eventId,
        String(payload.totalAmount),
      );
      await this.repo.markProcessed(eventId, 'order.created');

      const paymentCompleted: PaymentCompletedPayload = {
        eventId,
        orderId: payload.orderId,
        paymentId: payment.id,
        status: 'completed',
        amount: payload.totalAmount,
      };
      this.channel.publish(
        EXCHANGE,
        ROUTING_KEYS.PAYMENT_COMPLETED,
        Buffer.from(JSON.stringify(paymentCompleted)),
        { persistent: true, contentType: 'application/json', messageId: eventId },
      );
      this.logger.log(`Payment completed orderId=${payload.orderId} eventId=${eventId}, published payment.completed`);
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
