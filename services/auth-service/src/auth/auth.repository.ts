import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshTokenEntity } from './entities/refresh-token.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repo: Repository<RefreshTokenEntity>,
  ) {}

  async saveRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<RefreshTokenEntity> {
    const entity = this.repo.create({ userId, tokenHash, expiresAt });
    return this.repo.save(entity);
  }

  async findValidToken(tokenHash: string): Promise<RefreshTokenEntity | null> {
    return this.repo.findOne({
      where: { tokenHash },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}
