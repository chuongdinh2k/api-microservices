import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { NotFoundException, AppException } from '@ecommerce/shared';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrdersRepository } from './orders.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderEventsPublisher } from '../events/order-events.publisher';

@Injectable()
export class OrdersService {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly orderEvents: OrderEventsPublisher,
  ) {}

  async findAll() {
    const orders = await this.repo.findAll();
    return orders.map((o: OrderEntity) => this.toResponse(o));
  }

  async create(dto: CreateOrderDto) {
    // const userUrl = this.config.get<string>('USER_SERVICE_URL');
    const userUrl = 'http://localhost:3002';
    // const productUrl = this.config.get<string>('PRODUCT_SERVICE_URL');
    const productUrl = 'http://localhost:3003';
    if (userUrl) {
      try {
        await firstValueFrom(this.http.get(`${userUrl}/users/${dto.userId}`));
      } catch {
        throw new AppException('User not found', 400);
      }
    }
    const itemsWithPrice: Array<{ productId: string; quantity: number; unitPrice: string }> = [];
    for (const it of dto.items) {
      let unitPrice = '0';
      if (productUrl) {
        try {
          const res = await firstValueFrom(this.http.get(`${productUrl}/products/${it.productId}`));
          unitPrice = String((res.data as { price?: number }).price ?? 0);
        } catch {
          throw new AppException(`Product ${it.productId} not found`, 400);
        }
      }
      itemsWithPrice.push({ productId: it.productId, quantity: it.quantity, unitPrice });
    }
    const totalAmount = itemsWithPrice
      .reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0)
      .toFixed(2);
    const order = await this.repo.create(
      { userId: dto.userId, status: 'pending', totalAmount },
      itemsWithPrice,
    );
    const response = this.toResponse(order);
    await this.orderEvents.publishOrderCreated({
      orderId: order.id,
      userId: order.userId,
      totalAmount: parseFloat(order.totalAmount),
      items: (order.items || []).map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unitPrice),
      })),
      createdAt: order.createdAt.toISOString(),
    });
    return response;
  }

  async findById(id: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    return this.toResponse(order);
  }

  async findByUserId(userId: string) {
    const orders = await this.repo.findByUserId(userId);
    return orders.map((o) => this.toResponse(o));
  }

  private toResponse(order: OrderEntity) {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: parseFloat(order.totalAmount),
      createdAt: order.createdAt,
      items: (order.items || []).map((i: OrderItemEntity) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unitPrice),
      })),
    };
  }
}
