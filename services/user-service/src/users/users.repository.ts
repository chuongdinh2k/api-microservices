import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async create(entity: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.repo.create(entity);
    return this.repo.save(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { email } });
  }

  async update(id: string, data: Partial<Pick<UserEntity, 'name' | 'passwordHash'>>): Promise<UserEntity> {
    await this.repo.update(id, data as Partial<UserEntity>);
    const updated = await this.repo.findOne({ where: { id } });
    if (!updated) throw new Error('User not found after update');
    return updated;
  }
  async findAll(): Promise<UserEntity[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }
  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
