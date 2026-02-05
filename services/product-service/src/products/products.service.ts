import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@ecommerce/shared';
import { ProductsRepository } from './products.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  async create(dto: CreateProductDto) {
    const entity = await this.repo.create({
      name: dto.name,
      description: dto.description ?? null,
      price: String(dto.price),
      stock: dto.stock ?? 0,
    });
    return this.toResponse(entity);
  }

  async findById(id: string) {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundException('Product not found');
    return this.toResponse(entity);
  }

  async findAll() {
    const list = await this.repo.findAll();
    return list.map((e) => this.toResponse(e));
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Product not found');
    const updates: Partial<{ name: string; description: string | null; price: string; stock: number }> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.price !== undefined) updates.price = String(dto.price);
    if (dto.stock !== undefined) updates.stock = dto.stock;
    const updated = await this.repo.update(id, updates);
    return this.toResponse(updated);
  }

  async delete(id: string) {
    const entity = await this.repo.findById(id);
    if (!entity) throw new NotFoundException('Product not found');
    await this.repo.delete(id);
  }

  private toResponse(entity: { id: string; name: string; description: string | null; price: string; stock: number; createdAt: Date; updatedAt: Date }) {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      price: parseFloat(entity.price),
      stock: entity.stock,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
