import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { 
  AnalyticsEvent as AnalyticsEventEntity,
  IAnalyticsRepository,
  EventStatus 
} from '../../../../../libs/shared-dtos/src';
import { AnalyticsEvent, AnalyticsEventDocument } from '../../schemas/analytics-event.schema';

/**
 * Analytics事件仓储实现
 * 实现IAnalyticsRepository接口，提供MongoDB数据持久化
 */
@Injectable()
export class AnalyticsEventRepository implements IAnalyticsRepository {
  constructor(
    @InjectModel(AnalyticsEvent.name) 
    private readonly analyticsEventModel: Model<AnalyticsEventDocument>
  ) {}

  async save(event: AnalyticsEventEntity): Promise<void> {
    try {
      const eventData = this.mapToDocument(event);
      
      await this.analyticsEventModel.findOneAndUpdate(
        { eventId: eventData.eventId },
        eventData,
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error saving analytics event:', error);
      throw new Error('Failed to save analytics event');
    }
  }

  async findById(id: string): Promise<AnalyticsEventEntity | null> {
    try {
      const document = await this.analyticsEventModel.findOne({ eventId: id }).exec();
      return document ? this.mapToEntity(document) : null;
    } catch (error) {
      console.error('Error finding analytics event by id:', error);
      throw new Error('Failed to find analytics event');
    }
  }

  async findByIds(ids: string[]): Promise<AnalyticsEventEntity[]> {
    try {
      const documents = await this.analyticsEventModel
        .find({ eventId: { $in: ids } })
        .exec();
      
      return documents.map(doc => this.mapToEntity(doc));
    } catch (error) {
      console.error('Error finding analytics events by ids:', error);
      throw new Error('Failed to find analytics events');
    }
  }

  async findBySession(
    sessionId: string, 
    timeRange?: { startDate: Date; endDate: Date }
  ): Promise<AnalyticsEventEntity[]> {
    try {
      let query = this.analyticsEventModel.find({ sessionId });

      if (timeRange) {
        query = query.where('timestamp').gte(timeRange.startDate.getTime()).lte(timeRange.endDate.getTime());
      }

      const documents = await query.sort({ timestamp: -1 }).exec();
      return documents.map(doc => this.mapToEntity(doc));
    } catch (error) {
      console.error('Error finding analytics events by session:', error);
      throw new Error('Failed to find session analytics events');
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<AnalyticsEventEntity[]> {
    try {
      const documents = await this.analyticsEventModel
        .find({
          timestamp: {
            $gte: startDate,
            $lte: endDate
          }
        })
        .sort({ timestamp: -1 })
        .exec();

      return documents.map(doc => this.mapToEntity(doc));
    } catch (error) {
      console.error('Error finding analytics events by date range:', error);
      throw new Error('Failed to find analytics events by date range');
    }
  }

  async countSessionEvents(sessionId: string): Promise<number> {
    try {
      return await this.analyticsEventModel.countDocuments({ sessionId }).exec();
    } catch (error) {
      console.error('Error counting session events:', error);
      throw new Error('Failed to count session events');
    }
  }

  async deleteExpired(olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.analyticsEventModel
        .deleteMany({
          $or: [
            { status: EventStatus.EXPIRED },
            { retentionExpiry: { $lt: cutoffDate } }
          ]
        })
        .exec();

      return result.deletedCount || 0;
    } catch (error) {
      console.error('Error deleting expired events:', error);
      throw new Error('Failed to delete expired events');
    }
  }

  async anonymizeOldEvents(olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.analyticsEventModel
        .updateMany(
          {
            timestamp: { $lt: cutoffDate },
            status: { $ne: EventStatus.ANONYMIZED },
            isAnonymized: false
          },
          {
            $set: {
              status: EventStatus.ANONYMIZED,
              isAnonymized: true,
              userId: undefined,
              'deviceInfo.userAgent': undefined,
              'geoLocation': undefined,
              'context.userAgent': undefined,
              'context.referrer': undefined
            }
          }
        )
        .exec();

      return result.modifiedCount || 0;
    } catch (error) {
      console.error('Error anonymizing old events:', error);
      throw new Error('Failed to anonymize old events');
    }
  }

  private mapToDocument(event: AnalyticsEventEntity): any {
    return {
      eventId: event.getId().getValue(),
      sessionId: event.getSessionId(),
      userId: event.getUserId(),
      eventType: event.getEventType(),
      status: event.getStatus(),
      timestamp: new Date(event.getTimestamp()),
      retentionExpiry: event.getRetentionExpiry(),
      // 这里需要根据实际的domain entity结构进行映射
      eventData: {}, // 需要从domain entity获取事件数据
      context: {}, // 需要从domain entity获取上下文
      eventCategory: 'user_behavior', // 默认值，需要从domain entity获取
      consentStatus: 'granted', // 默认值，需要从domain entity获取
      isSystemSession: false, // 默认值，需要从domain entity获取
      isAnonymized: event.getStatus() === EventStatus.ANONYMIZED
    };
  }

  private mapToEntity(document: AnalyticsEventDocument): AnalyticsEventEntity {
    // 这里需要根据实际的domain entity构造方法进行映射
    return AnalyticsEventEntity.restore({
      id: document.eventId,
      session: {
        sessionId: document.sessionId,
        userId: document.userId,
        deviceInfo: document.deviceInfo,
        geoLocation: document.geoLocation,
        consentStatus: document.consentStatus,
        isSystemSession: document.isSystemSession
      },
      eventData: {
        eventType: document.eventType,
        eventCategory: document.eventCategory,
        payload: document.eventData,
        sensitiveDataMask: document.sensitiveDataMask || []
      },
      timestamp: {
        timestamp: document.timestamp,
        timezone: 'UTC'
      },
      context: document.context || {},
      status: document.status,
      createdAt: (document as any).createdAt?.toISOString() || document.timestamp.toISOString(),
      processedAt: document.processedAt?.toISOString(),
      retentionExpiry: document.retentionExpiry?.toISOString()
    });
  }
}