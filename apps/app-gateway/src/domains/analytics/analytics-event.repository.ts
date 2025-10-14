import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// Fallback interfaces and types
interface IAnalyticsRepository {
  save(event: AnalyticsEventEntity): Promise<void>;
  findById(id: string): Promise<AnalyticsEventEntity | null>;
  findBySessionId(sessionId: string): Promise<AnalyticsEventEntity[]>;
  findByUserId(userId: string): Promise<AnalyticsEventEntity[]>;
  updateStatus(id: string, status: EventStatus): Promise<void>;
  delete(id: string): Promise<void>;
}

enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  ANONYMIZED = 'anonymized',
}

interface AnalyticsEventEntity {
  id: string;
  sessionId: string;
  userId?: string;
  eventType: string;
  eventData: any;
  timestamp: Date;
  status: EventStatus;
  retentionExpiry?: Date;
}
import {
  AnalyticsEvent,
  AnalyticsEventDocument,
} from '../../schemas/analytics-event.schema';

/**
 * Analytics事件仓储实现
 * 实现IAnalyticsRepository接口，提供MongoDB数据持久化
 */
@Injectable()
export class AnalyticsEventRepository implements IAnalyticsRepository {
  private readonly logger = new Logger(AnalyticsEventRepository.name);
  /**
   * Initializes a new instance of the Analytics Event Repository.
   * @param analyticsEventModel - The analytics event model.
   */
  constructor(
    @InjectModel(AnalyticsEvent.name)
    private readonly analyticsEventModel: Model<AnalyticsEventDocument>,
  ) {}

  /**
   * Performs the save operation.
   * @param event - The event.
   * @returns A promise that resolves when the operation completes.
   */
  async save(event: AnalyticsEventEntity): Promise<void> {
    try {
      const eventData = this.mapToDocument(event);

      await this.analyticsEventModel.findOneAndUpdate(
        { eventId: eventData.eventId },
        eventData,
        { upsert: true, new: true },
      );
    } catch (error) {
      this.logger.error(
        'Error saving analytics event',
        error.stack || error.message,
      );
      throw new Error('Failed to save analytics event');
    }
  }

  /**
   * Performs the find by id operation.
   * @param id - The id.
   * @returns A promise that resolves to AnalyticsEventEntity | null.
   */
  async findById(id: string): Promise<AnalyticsEventEntity | null> {
    try {
      const document = await this.analyticsEventModel
        .findOne({ eventId: id })
        .exec();
      return document ? this.mapToEntity(document) : null;
    } catch (error) {
      this.logger.error(
        'Error finding analytics event by id',
        error.stack || error.message,
      );
      throw new Error('Failed to find analytics event');
    }
  }

  /**
   * Performs the find by session id operation.
   * @param sessionId - The session id.
   * @returns A promise that resolves to an array of AnalyticsEventEntity.
   */
  async findBySessionId(sessionId: string): Promise<AnalyticsEventEntity[]> {
    try {
      const documents = await this.analyticsEventModel
        .find({ sessionId })
        .sort({ timestamp: -1 })
        .exec();
      return documents.map((doc) => this.mapToEntity(doc));
    } catch (error) {
      this.logger.error(
        'Error finding analytics events by sessionId',
        error.stack || error.message,
      );
      throw new Error('Failed to find analytics events by sessionId');
    }
  }

  /**
   * Performs the find by user id operation.
   * @param userId - The user id.
   * @returns A promise that resolves to an array of AnalyticsEventEntity.
   */
  async findByUserId(userId: string): Promise<AnalyticsEventEntity[]> {
    try {
      const documents = await this.analyticsEventModel
        .find({ userId })
        .sort({ timestamp: -1 })
        .exec();
      return documents.map((doc) => this.mapToEntity(doc));
    } catch (error) {
      this.logger.error(
        'Error finding analytics events by userId',
        error.stack || error.message,
      );
      throw new Error('Failed to find analytics events by userId');
    }
  }

  /**
   * Updates status.
   * @param id - The id.
   * @param status - The status.
   * @returns A promise that resolves when the operation completes.
   */
  async updateStatus(id: string, status: EventStatus): Promise<void> {
    try {
      await this.analyticsEventModel
        .updateOne({ eventId: id }, { $set: { status } })
        .exec();
    } catch (error) {
      this.logger.error(
        'Error updating analytics event status',
        error.stack || error.message,
      );
      throw new Error('Failed to update analytics event status');
    }
  }

  /**
   * Removes the entity.
   * @param id - The id.
   * @returns A promise that resolves when the operation completes.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.analyticsEventModel.deleteOne({ eventId: id }).exec();
    } catch (error) {
      this.logger.error(
        'Error deleting analytics event',
        error.stack || error.message,
      );
      throw new Error('Failed to delete analytics event');
    }
  }

  /**
   * Performs the find by ids operation.
   * @param ids - The ids.
   * @returns A promise that resolves to an array of AnalyticsEventEntity.
   */
  async findByIds(ids: string[]): Promise<AnalyticsEventEntity[]> {
    try {
      const documents = await this.analyticsEventModel
        .find({ eventId: { $in: ids } })
        .exec();

      return documents.map((doc) => this.mapToEntity(doc));
    } catch (error) {
      this.logger.error(
        'Error finding analytics events by ids',
        error.stack || error.message,
      );
      throw new Error('Failed to find analytics events');
    }
  }

  /**
   * Performs the find by session operation.
   * @param sessionId - The session id.
   * @param timeRange - The time range.
   * @returns A promise that resolves to an array of AnalyticsEventEntity.
   */
  async findBySession(
    sessionId: string,
    timeRange?: { startDate: Date; endDate: Date },
  ): Promise<AnalyticsEventEntity[]> {
    try {
      let query = this.analyticsEventModel.find({ sessionId });

      if (timeRange) {
        query = query
          .where('timestamp')
          .gte(timeRange.startDate.getTime())
          .lte(timeRange.endDate.getTime());
      }

      const documents = await query.sort({ timestamp: -1 }).exec();
      return documents.map((doc) => this.mapToEntity(doc));
    } catch (error) {
      this.logger.error(
        'Error finding analytics events by session',
        error.stack || error.message,
      );
      throw new Error('Failed to find session analytics events');
    }
  }

  /**
   * Performs the find by date range operation.
   * @param startDate - The start date.
   * @param endDate - The end date.
   * @returns A promise that resolves to an array of AnalyticsEventEntity.
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<AnalyticsEventEntity[]> {
    try {
      const documents = await this.analyticsEventModel
        .find({
          timestamp: {
            $gte: startDate,
            $lte: endDate,
          },
        })
        .sort({ timestamp: -1 })
        .exec();

      return documents.map((doc) => this.mapToEntity(doc));
    } catch (error) {
      this.logger.error(
        'Error finding analytics events by date range',
        error.stack || error.message,
      );
      throw new Error('Failed to find analytics events by date range');
    }
  }

  /**
   * Performs the count session events operation.
   * @param sessionId - The session id.
   * @returns A promise that resolves to number value.
   */
  async countSessionEvents(sessionId: string): Promise<number> {
    try {
      return await this.analyticsEventModel
        .countDocuments({ sessionId })
        .exec();
    } catch (error) {
      this.logger.error(
        'Error counting session events',
        error.stack || error.message,
      );
      throw new Error('Failed to count session events');
    }
  }

  /**
   * Removes expired.
   * @param olderThanDays - The older than days.
   * @returns A promise that resolves to number value.
   */
  async deleteExpired(olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.analyticsEventModel
        .deleteMany({
          $or: [
            { status: EventStatus.EXPIRED },
            { retentionExpiry: { $lt: cutoffDate } },
          ],
        })
        .exec();

      return result.deletedCount || 0;
    } catch (error) {
      this.logger.error(
        'Error deleting expired events',
        error.stack || error.message,
      );
      throw new Error('Failed to delete expired events');
    }
  }

  /**
   * Performs the anonymize old events operation.
   * @param olderThanDays - The older than days.
   * @returns A promise that resolves to number value.
   */
  async anonymizeOldEvents(olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.analyticsEventModel
        .updateMany(
          {
            timestamp: { $lt: cutoffDate },
            status: { $ne: EventStatus.ANONYMIZED },
            isAnonymized: false,
          },
          {
            $set: {
              status: EventStatus.ANONYMIZED,
              isAnonymized: true,
              userId: undefined,
              'deviceInfo.userAgent': undefined,
              geoLocation: undefined,
              'context.userAgent': undefined,
              'context.referrer': undefined,
            },
          },
        )
        .exec();

      return result.modifiedCount || 0;
    } catch (error) {
      this.logger.error(
        'Error anonymizing old events',
        error.stack || error.message,
      );
      throw new Error('Failed to anonymize old events');
    }
  }

  private mapToDocument(event: AnalyticsEventEntity): any {
    return {
      eventId: event.id,
      sessionId: event.sessionId,
      userId: event.userId,
      eventType: event.eventType,
      status: event.status,
      timestamp: new Date(event.timestamp),
      retentionExpiry: event.retentionExpiry,
      // Map-through fields present on the entity
      eventData: event.eventData ?? {},
      context: {},
      eventCategory: 'user_behavior',
      consentStatus: 'granted',
      isSystemSession: false,
      isAnonymized: event.status === EventStatus.ANONYMIZED,
    };
  }

  private mapToEntity(document: AnalyticsEventDocument): AnalyticsEventEntity {
    return {
      id: document.eventId,
      sessionId: document.sessionId,
      userId: document.userId,
      eventType: document.eventType,
      eventData: document.eventData,
      timestamp: document.timestamp,
      status: document.status as EventStatus,
      retentionExpiry: document.retentionExpiry,
    };
  }
}
