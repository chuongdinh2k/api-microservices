import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

/** Idempotency: one row per processed eventId */
@Entity('processed_events')
export class ProcessedEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  eventId!: string;

  @Column({ type: 'varchar', length: 64 })
  eventType!: string;

  @CreateDateColumn()
  processedAt!: Date;
}
