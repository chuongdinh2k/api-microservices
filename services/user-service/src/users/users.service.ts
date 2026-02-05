import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { NotFoundException, ConflictException } from '@ecommerce/shared';
import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async findAll() {
    const users = await this.repo.findAll();
    return users.map((user) => this.toResponse(user));
  }

  async create(dto: CreateUserDto) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.repo.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });
    return this.toResponse(user);
  }

  async findById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.toResponse(user);
  }

  async findByEmail(email: string) {
    const user = await this.repo.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    return this.toResponse(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    const updates: { name?: string; passwordHash?: string } = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.password !== undefined) updates.passwordHash = await bcrypt.hash(dto.password, 10);
    const updated = await this.repo.update(id, updates);
    return this.toResponse(updated);
  }

  async delete(id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.repo.delete(id);
  }

  private toResponse(entity: UserEntity) {
    const { passwordHash: _, ...rest } = entity;
    return rest;
  }
}
