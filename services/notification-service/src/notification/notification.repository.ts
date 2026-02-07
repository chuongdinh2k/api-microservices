import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessedEventEntity } from './entities/processed-event.entity';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(ProcessedEventEntity)
    private readonly repo: Repository<ProcessedEventEntity>,
  ) {}

  async isProcessed(eventId: string): Promise<boolean> {
    const one = await this.repo.findOne({ where: { eventId } });
    return !!one;
  }

  async markProcessed(eventId: string, eventType: string): Promise<void> {
    await this.repo.save(this.repo.create({ eventId, eventType }));
  }
}
