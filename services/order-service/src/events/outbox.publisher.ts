import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { type OrderCreatedPayload } from '@ecommerce/shared';
import { OutboxRepository } from '../orders/outbox.repository';
import { OrderEventsPublisher, EVENT_TYPE_ORDER_CREATED } from './order-events.publisher';

const POLL_INTERVAL_MS = 2000;
const BATCH_SIZE = 50;

@Injectable()
export class OutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisher.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly outboxRepo: OutboxRepository,
    private readonly orderEvents: OrderEventsPublisher,
  ) {}

  onModuleInit() {
    this.intervalId = setInterval(() => this.tick(), POLL_INTERVAL_MS);
    this.logger.log('Outbox publisher started');
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.logger.log('Outbox publisher stopped');
  }

  private async tick(): Promise<void> {
    try {
      const pending = await this.outboxRepo.getUnpublished(BATCH_SIZE);
      for (const row of pending) {
        if (row.eventType === EVENT_TYPE_ORDER_CREATED) {
          const payload = row.payload as unknown as OrderCreatedPayload;
          const ok = await this.orderEvents.publishOrderCreatedWithId(payload);
          if (ok) {
            await this.outboxRepo.markPublished(row.id);
          }
          // If not ok (e.g. channel down), leave publishedAt null so we retry next tick
        } else {
          this.logger.warn(`Unknown eventType=${row.eventType}, marking published to avoid infinite loop`);
          await this.outboxRepo.markPublished(row.id);
        }
      }
    } catch (err) {
      this.logger.error('Outbox tick error', err);
    }
  }
}
