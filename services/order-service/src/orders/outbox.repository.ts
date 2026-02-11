import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, IsNull } from 'typeorm';
import { OutboxEntity } from './entities/outbox.entity';

export interface OutboxEntryInsert {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  eventId: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class OutboxRepository {
  constructor(
    @InjectRepository(OutboxEntity)
    private readonly repo: Repository<OutboxEntity>,
  ) {}

  async insertWithinTransaction(manager: EntityManager, entry: OutboxEntryInsert): Promise<OutboxEntity> {
    const entity = manager.create(OutboxEntity, {
      ...entry,
      publishedAt: null,
    });
    return manager.save(OutboxEntity, entity);
  }

  async getUnpublished(limit = 50): Promise<OutboxEntity[]> {
    return this.repo.find({
      where: { publishedAt: IsNull() },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async markPublished(id: string): Promise<void> {
    await this.repo.update(id, { publishedAt: new Date() });
  }
}
