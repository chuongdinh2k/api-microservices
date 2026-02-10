import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EXCHANGE, DLX_EXCHANGE, ROUTING_KEYS, type PaymentFailedPayload } from '@ecommerce/shared';
import { InventoryRepository } from './inventory.repository';

interface AmqpConnection {
  createChannel(): Promise<amqp.Channel>;
  close(): Promise<void>;
}

const QUEUE = 'inventory.payment-failed';
const DLQ = 'inventory.payment-failed.dlq';
const MAX_RETRIES = 3;
const RETRY_HEADER = 'x-retry-count';

@Injectable()
export class PaymentFailedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentFailedConsumer.name);
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly repo: InventoryRepository,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) {
      this.logger.warn('RABBITMQ_URL not set; payment-failed consumer not started');
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
      await this.channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEYS.PAYMENT_FAILED);

      await this.channel.consume(QUEUE, (msg) => this.handleMessage(msg));
      this.logger.log('Inventory payment-failed consumer started (compensation: release inventory)');
    } catch (err) {
      this.logger.error('Failed to start payment-failed consumer', err);
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

    let payload: PaymentFailedPayload | undefined;
    let eventId: string | undefined;
    try {
      payload = JSON.parse(msg.content.toString()) as PaymentFailedPayload;
      eventId = payload.eventId ?? msg.properties.messageId;

      this.logger.log(
        `[RECV] payment.failed orderId=${payload.orderId} eventId=${eventId} retryCount=${retryCount}/${MAX_RETRIES} (compensation)`,
      );

      if (!eventId) {
        this.channel.nack(msg, false, false);
        return;
      }

      const releaseEventId = `release:${payload.orderId}:${eventId}`;
      if (await this.repo.isProcessed(releaseEventId)) {
        this.logger.log(`[IDEMPOTENCY] release already processed for orderId=${payload.orderId}, ack`);
        this.channel.ack(msg);
        return;
      }

      await this.repo.releaseByOrderId(payload.orderId);
      await this.repo.markProcessed(releaseEventId, 'payment.failed.release');
      this.logger.log(`[SUCCESS] Released inventory for orderId=${payload.orderId} eventId=${eventId}`);
      this.channel.ack(msg);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const orderId = payload?.orderId ?? '?';
      const evId = eventId ?? '?';
      this.logger.warn(
        `[FAIL] orderId=${orderId} eventId=${evId} retryCount=${retryCount}/${MAX_RETRIES} error=${errMsg}`,
      );
      if (retryCount < MAX_RETRIES) {
        this.channel.sendToQueue(QUEUE, msg.content, {
          persistent: true,
          contentType: msg.properties.contentType ?? 'application/json',
          messageId: msg.properties.messageId,
          headers: { ...msg.properties.headers, [RETRY_HEADER]: retryCount + 1 },
        });
        this.channel.ack(msg);
      } else {
        this.logger.error(`[DLQ] Max retries reached, nacking to ${DLQ}`);
        this.channel.nack(msg, false, false);
      }
    }
  }
}
