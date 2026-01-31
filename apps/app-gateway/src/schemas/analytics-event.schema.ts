import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';
import {
  EventType,
  EventStatus,
  EventCategory,
  ConsentStatus,
} from '@ai-recruitment-clerk/shared-dtos';

export type AnalyticsEventDocument = AnalyticsEvent & Document;

/**
 * Represents the analytics event event.
 */
@Schema({
  collection: 'analytics_events',
  timestamps: true,
  versionKey: false,
})
export class AnalyticsEvent {
  @Prop({ required: true, unique: true, index: true, default: '' })
  public eventId!: string;

  @Prop({ required: true, default: '' })
  public sessionId!: string;

  @Prop()
  public userId?: string;

  @Prop({ type: String, required: true, enum: Object.values(EventType), default: EventType.USER_INTERACTION })
  public eventType!: EventType;

  @Prop({ type: String, required: true, enum: Object.values(EventCategory), default: EventCategory.SYSTEM })
  public eventCategory!: EventCategory;

  @Prop({ type: String, required: true, enum: Object.values(EventStatus), default: EventStatus.PENDING_PROCESSING })
  public status!: EventStatus;

  @Prop({ type: Object, required: true, default: {} })
  public eventData!: Record<string, unknown>;

  @Prop({ type: Object })
  public context?: Record<string, unknown>;

  @Prop({ required: true, default: () => new Date() })
  public timestamp!: Date;

  @Prop({ type: Object })
  public deviceInfo?: {
    userAgent: string;
    screenResolution: string;
    language: string;
    timezone: string;
  };

  @Prop({ type: Object })
  public geoLocation?: {
    country: string;
    region: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    default: ConsentStatus.GRANTED,
  })
  public consentStatus!: ConsentStatus;

  @Prop({ default: false })
  public isSystemSession!: boolean;

  @Prop()
  public processedAt?: Date;

  @Prop()
  public retentionExpiry?: Date;

  @Prop({ default: false })
  public isAnonymized!: boolean;

  @Prop({ type: [String] })
  public sensitiveDataMask?: string[];

  @Prop({ type: Object })
  public metadata?: Record<string, unknown>;
}

export const AnalyticsEventSchema =
  SchemaFactory.createForClass(AnalyticsEvent);

// 创建复合索引提升查询性能
AnalyticsEventSchema.index({ sessionId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ eventType: 1, status: 1, timestamp: -1 });
AnalyticsEventSchema.index({ retentionExpiry: 1, status: 1 });
AnalyticsEventSchema.index({ timestamp: -1, eventCategory: 1 });
