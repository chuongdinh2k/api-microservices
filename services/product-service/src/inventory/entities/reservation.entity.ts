import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('reservations')
export class ReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'varchar', length: 36 })
  eventId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
