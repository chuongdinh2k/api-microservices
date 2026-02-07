import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PinoLoggerService } from '@ecommerce/shared';

@Controller('orders')
export class OrdersController {
  private readonly logger = new PinoLoggerService('OrdersController');
  constructor(private readonly orders: OrdersService) { }

  @Post()
  create(@Body() dto: CreateOrderDto) {
    this.logger.log('create order', dto);
    return this.orders.create(dto);
  }

  @Get()
  findAll() {
    this.logger.log('find all orders');
    return this.orders.findAll();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.orders.findByUserId(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orders.findById(id);
  }
}
