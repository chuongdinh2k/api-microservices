import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('outbox')
export class OutboxEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** e.g. 'order' */
  @Column({ type: 'varchar', length: 64 })
  aggregateType!: string;

  @Column({ type: 'uuid' })
  aggregateId!: string;

  /** e.g. 'order.created' - matches routing key */
  @Column({ type: 'varchar', length: 64 })
  eventType!: string;

  /** Idempotency key for consumers */
  @Column({ type: 'uuid' })
  eventId!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt!: Date | null;
}
