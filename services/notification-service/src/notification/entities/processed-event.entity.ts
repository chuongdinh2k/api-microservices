import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('processed_events')
export class ProcessedEventEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  eventId!: string;

  @Column({ type: 'varchar', length: 64 })
  eventType!: string;

  @CreateDateColumn()
  processedAt!: Date;
}
