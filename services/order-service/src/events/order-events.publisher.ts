import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { randomUUID } from 'crypto';
import {
  EXCHANGE,
  ROUTING_KEYS,
  type OrderCreatedPayload,
} from '@ecommerce/shared';

interface AmqpConnection {
  createChannel(): Promise<amqp.Channel>;
  close(): Promise<void>;
}

@Injectable()
export class OrderEventsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderEventsPublisher.name);
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) {
      this.logger.warn('RABBITMQ_URL not set; order events will not be published');
      return;
    }
    try {
      this.connection = (await amqp.connect(url)) as unknown as AmqpConnection;
      this.channel = await this.connection.createChannel();
      if (this.channel) await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      this.logger.log('RabbitMQ publisher connected');
    } catch (err) {
      this.logger.error('Failed to connect to RabbitMQ', err);
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

  async publishOrderCreated(payload: Omit<OrderCreatedPayload, 'eventId'>): Promise<void> {
    if (!this.channel) return;
    const eventId = randomUUID();
    const message: OrderCreatedPayload = { ...payload, eventId };
    const sent = this.channel.publish(
      EXCHANGE,
      ROUTING_KEYS.ORDER_CREATED,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: eventId,
      },
    );
    if (!sent) {
      this.logger.warn('Buffer full; order.created event may not be delivered');
    } else {
      this.logger.log(`Published order.created eventId=${eventId} orderId=${payload.orderId}`);
    }
  }
}
