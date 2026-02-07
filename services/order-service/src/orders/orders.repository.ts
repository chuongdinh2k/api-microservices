import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly itemRepo: Repository<OrderItemEntity>,
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
