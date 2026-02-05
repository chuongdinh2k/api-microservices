import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { NotFoundException, AppException } from '@ecommerce/shared';
import { OrderEntity } from './entities/order.entity';
import { OrdersRepository } from './orders.repository';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateOrderDto) {
    const userUrl = this.config.get<string>('USER_SERVICE_URL');
    const productUrl = this.config.get<string>('PRODUCT_SERVICE_URL');
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
    return this.toResponse(order);
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
      items: (order.items || []).map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unitPrice),
      })),
    };
  }
}
