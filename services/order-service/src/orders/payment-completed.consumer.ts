import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import {
  EXCHANGE,
  DLX_EXCHANGE,
  ROUTING_KEYS,
  type PaymentCompletedPayload,
  type PaymentFailedPayload,
} from '@ecommerce/shared';
import { OrdersRepository } from './orders.repository';
import { ProcessedEventsRepository } from './processed-events.repository';

interface AmqpConnection {
  createChannel(): Promise<amqp.Channel>;
  close(): Promise<void>;
}

const QUEUE = 'order.payment-events';
const DLQ = 'order.payment-events.dlq';
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
      this.logger.warn('RABBITMQ_URL not set; payment events consumer not started');
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
      // Bind to both payment.completed and payment.failed routing keys
      await this.channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEYS.PAYMENT_COMPLETED);
      await this.channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEYS.PAYMENT_FAILED);

      await this.channel.consume(QUEUE, (msg) => this.handleMessage(msg));
      this.logger.log('Payment events consumer started (handles payment.completed and payment.failed)');
    } catch (err) {
      this.logger.error('Failed to start payment events consumer', err);
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
    const routingKey = msg.fields.routingKey;

    let payload: PaymentCompletedPayload | PaymentFailedPayload | undefined;
    let eventId: string | undefined;
    try {
      const rawPayload = JSON.parse(msg.content.toString());
      eventId = rawPayload.eventId ?? msg.properties.messageId;

      // Determine event type based on routing key
      const isCompleted = routingKey === ROUTING_KEYS.PAYMENT_COMPLETED;
      const isFailed = routingKey === ROUTING_KEYS.PAYMENT_FAILED;

      if (!isCompleted && !isFailed) {
        this.logger.warn(`[DLQ] Unknown routing key: ${routingKey}, nacking to DLQ`);
        this.channel.nack(msg, false, false);
        return;
      }

      payload = rawPayload as PaymentCompletedPayload | PaymentFailedPayload;

      const orderId = payload.orderId ?? '?';
      const eventType = isCompleted ? 'payment.completed' : 'payment.failed';
      const extraInfo = isCompleted
        ? `paymentId=${(payload as PaymentCompletedPayload).paymentId}`
        : `reason=${(payload as PaymentFailedPayload).reason}`;

      this.logger.log(
        `[RECV] ${eventType} orderId=${orderId} eventId=${eventId} retryCount=${retryCount}/${MAX_RETRIES} ${extraInfo}`,
      );

      if (!eventId) {
        this.logger.warn('[DLQ] Message without eventId, nacking to DLQ');
        this.channel.nack(msg, false, false);
        return;
      }

      if (await this.processedRepo.isProcessed(eventId)) {
        this.logger.log(`[IDEMPOTENCY] eventId=${eventId} already processed, ack`);
        this.channel.ack(msg);
        return;
      }

      // Handle payment.completed
      if (isCompleted) {
        const completedPayload = payload as PaymentCompletedPayload;
        this.logger.log(`[PROCESS] Updating order ${completedPayload.orderId} to confirmed`);
        await this.ordersRepo.updateStatus(completedPayload.orderId, 'confirmed');
        await this.processedRepo.markProcessed(eventId, 'payment.completed');
        this.logger.log(
          `[SUCCESS] Order ${completedPayload.orderId} status=confirmed paymentId=${completedPayload.paymentId} eventId=${eventId}`,
        );
      }
      // Handle payment.failed
      else if (isFailed) {
        const failedPayload = payload as PaymentFailedPayload;
        this.logger.log(`[PROCESS] Updating order ${failedPayload.orderId} to payment_failed`);
        await this.ordersRepo.updateStatus(failedPayload.orderId, 'payment_failed');
        await this.processedRepo.markProcessed(eventId, 'payment.failed');
        this.logger.log(
          `[SUCCESS] Order ${failedPayload.orderId} status=payment_failed eventId=${eventId} reason=${failedPayload.reason}`,
        );
      }

      this.channel.ack(msg);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const orderId = payload?.orderId ?? '?';
      const evId = eventId ?? '?';
      this.logger.warn(
        `[FAIL] orderId=${orderId} eventId=${evId} retryCount=${retryCount}/${MAX_RETRIES} error=${errMsg}`,
      );
      if (retryCount < MAX_RETRIES) {
        this.logger.log(
          `[RETRY] Republishing to queue with retryCount=${retryCount + 1} (next attempt ${retryCount + 2}/${MAX_RETRIES})`,
        );
        this.channel.sendToQueue(QUEUE, msg.content, {
          persistent: true,
          contentType: msg.properties.contentType ?? 'application/json',
          messageId: msg.properties.messageId,
          headers: { ...msg.properties.headers, [RETRY_HEADER]: retryCount + 1 },
        });
        this.channel.ack(msg);
      } else {
        this.logger.error(
          `[DLQ] Max retries reached (${MAX_RETRIES}), nacking to dead letter queue ${DLQ}`,
        );
        this.channel.nack(msg, false, false);
      }
    }
  }
}
