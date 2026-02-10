import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductEntity } from '../products/entities/product.entity';
import { ReservationEntity } from './entities/reservation.entity';
import { ProcessedEventEntity } from './entities/processed-event.entity';

export interface ReserveItem {
  productId: string;
  quantity: number;
}

@Injectable()
export class InventoryRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservationRepo: Repository<ReservationEntity>,
    @InjectRepository(ProcessedEventEntity)
    private readonly processedRepo: Repository<ProcessedEventEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async isProcessed(eventId: string): Promise<boolean> {
    const one = await this.processedRepo.findOne({ where: { eventId } });
    return !!one;
  }

  async markProcessed(eventId: string, eventType: string): Promise<void> {
    await this.processedRepo.save(
      this.processedRepo.create({ eventId, eventType }),
    );
  }

  /**
   * Reserve inventory for an order. Decrements product stock and creates reservation rows.
   * Throws if any product has insufficient stock.
   */
  async reserve(orderId: string, items: ReserveItem[], eventId: string): Promise<void> {
    await this.dataSource.transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.getRepository(ProductEntity).findOne({ where: { id: item.productId }, lock: { mode: 'pessimistic_write' } });
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        const available = Number(product.stock);
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}: need ${item.quantity}, have ${available}`);
        }
        await tx.getRepository(ProductEntity).update(
          { id: item.productId },
          { stock: available - item.quantity },
        );
        await tx.getRepository(ReservationEntity).save(
          tx.getRepository(ReservationEntity).create({
            orderId,
            productId: item.productId,
            quantity: item.quantity,
            eventId,
          }),
        );
      }
    });
  }

  /**
   * Release reserved inventory for an order (compensation). Restores product stock and removes reservation rows.
   */
  async releaseByOrderId(orderId: string): Promise<void> {
    const reservations = await this.reservationRepo.find({ where: { orderId } });
    if (reservations.length === 0) return;

    await this.dataSource.transaction(async (tx) => {
      for (const res of reservations) {
        const product = await tx.getRepository(ProductEntity).findOne({ where: { id: res.productId } });
        if (product) {
          const current = Number(product.stock);
          await tx.getRepository(ProductEntity).update(
            { id: res.productId },
            { stock: current + res.quantity },
          );
        }
        await tx.getRepository(ReservationEntity).delete({ id: res.id });
      }
    });
  }
}
