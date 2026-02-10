import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EXCHANGE, DLX_EXCHANGE, ROUTING_KEYS, type InventoryReservationFailedPayload } from '@ecommerce/shared';
import { OrdersRepository } from './orders.repository';
import { ProcessedEventsRepository } from './processed-events.repository';

interface AmqpConnection {
  createChannel(): Promise<amqp.Channel>;
  close(): Promise<void>;
}

const QUEUE = 'order.inventory-events';
const DLQ = 'order.inventory-events.dlq';
const MAX_RETRIES = 3;
const RETRY_HEADER = 'x-retry-count';

@Injectable()
export class InventoryReservationFailedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryReservationFailedConsumer.name);
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
      this.logger.warn('RABBITMQ_URL not set; inventory-reservation-failed consumer not started');
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
      await this.channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEYS.INVENTORY_RESERVATION_FAILED);

      await this.channel.consume(QUEUE, (msg) => this.handleMessage(msg));
      this.logger.log('Inventory reservation failed consumer started');
    } catch (err) {
      this.logger.error('Failed to start inventory-reservation-failed consumer', err);
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

    let payload: InventoryReservationFailedPayload | undefined;
    let eventId: string | undefined;
    try {
      payload = JSON.parse(msg.content.toString()) as InventoryReservationFailedPayload;
      eventId = payload.eventId ?? msg.properties.messageId;

      this.logger.log(
        `[RECV] inventory.reservation_failed orderId=${payload.orderId} eventId=${eventId} retryCount=${retryCount}/${MAX_RETRIES} reason=${payload.reason}`,
      );

      if (!eventId) {
        this.channel.nack(msg, false, false);
        return;
      }

      if (await this.processedRepo.isProcessed(eventId)) {
        this.logger.log(`[IDEMPOTENCY] eventId=${eventId} already processed, ack`);
        this.channel.ack(msg);
        return;
      }

      await this.ordersRepo.updateStatus(payload.orderId, 'cancelled');
      await this.processedRepo.markProcessed(eventId, 'inventory.reservation_failed');
      this.logger.log(`[SUCCESS] Order ${payload.orderId} status=cancelled (inventory reservation failed)`);
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
