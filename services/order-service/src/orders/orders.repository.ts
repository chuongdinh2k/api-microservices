import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OutboxRepository } from './outbox.repository';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly itemRepo: Repository<OrderItemEntity>,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async create(order: Partial<OrderEntity>, items: Array<{ productId: string; quantity: number; unitPrice: string }>): Promise<OrderEntity> {
    const entity = this.orderRepo.create(order);
    const saved = await this.orderRepo.save(entity);
    for (const it of items) {
      const item = this.itemRepo.create({
        orderId: saved.id,
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      });
      await this.itemRepo.save(item);
    }
    return this.orderRepo.findOneOrFail({ where: { id: saved.id }, relations: ['items'] });
  }

  /**
   * Creates order, order items, and outbox row in a single transaction.
   * Ensures either all persist or none (atomicity for outbox pattern).
   * The outbox payload is built from the saved order so orderId and createdAt are correct.
   */
  async createOrderAndOutbox(
    order: Partial<OrderEntity>,
    items: Array<{ productId: string; quantity: number; unitPrice: string }>,
    eventId: string,
  ): Promise<OrderEntity> {
    return this.orderRepo.manager.transaction(async (manager) => {
      const orderEntity = manager.create(OrderEntity, order);
      const saved = await manager.save(OrderEntity, orderEntity);
      for (const it of items) {
        const itemEntity = manager.create(OrderItemEntity, {
          orderId: saved.id,
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        });
        await manager.save(OrderItemEntity, itemEntity);
      }
      const payload = {
        eventId,
        orderId: saved.id,
        userId: saved.userId,
        totalAmount: parseFloat(saved.totalAmount),
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: parseFloat(i.unitPrice),
        })),
        createdAt: saved.createdAt.toISOString(),
      };
      await this.outboxRepo.insertWithinTransaction(manager, {
        aggregateType: 'order',
        aggregateId: saved.id,
        eventType: 'order.created',
        eventId,
        payload,
      });
      const orderRepo = manager.getRepository(OrderEntity);
      return orderRepo.findOneOrFail({ where: { id: saved.id }, relations: ['items'] });
    });
  }
  async findAll(): Promise<OrderEntity[]> {
    return this.orderRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<OrderEntity | null> {
    return this.orderRepo.findOne({ where: { id }, relations: ['items'] });
  }

  async findByUserId(userId: string): Promise<OrderEntity[]> {
    return this.orderRepo.find({ where: { userId }, relations: ['items'], order: { createdAt: 'DESC' } });
  }

  async updateStatus(id: string, status: OrderEntity['status']): Promise<OrderEntity> {
    await this.orderRepo.update(id, { status });
    const updated = await this.orderRepo.findOne({ where: { id }, relations: ['items'] });
    if (!updated) throw new Error('Order not found');
    return updated;
  }
}
