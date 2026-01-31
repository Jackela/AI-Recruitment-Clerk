import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
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
  @Prop({ required: true, unique: true, index: true })
  eventId: string = '';

  @Prop({ required: true })
  sessionId: string = '';

  @Prop()
  userId?: string;

  @Prop({ type: String, required: true, enum: Object.values(EventType) })
  eventType: EventType = EventType.USER_INTERACTION;

  @Prop({ type: String, required: true, enum: Object.values(EventCategory) })
  eventCategory: EventCategory = EventCategory.SYSTEM;

  @Prop({ type: String, required: true, enum: Object.values(EventStatus) })
  status: EventStatus = EventStatus.PENDING_PROCESSING;

  @Prop({ type: Object, required: true, default: {} })
  eventData!: Record<string, unknown>;

  @Prop({ type: Object })
  context?: Record<string, unknown>;

  @Prop({ required: true })
  timestamp: Date = new Date();

  @Prop({ type: Object })
  deviceInfo?: {
    userAgent: string;
    screenResolution: string;
    language: string;
    timezone: string;
  };

  @Prop({ type: Object })
  geoLocation?: {
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
  consentStatus: ConsentStatus = ConsentStatus.GRANTED;

  @Prop({ default: false })
  isSystemSession: boolean = false;

  @Prop()
  processedAt?: Date;

  @Prop()
  retentionExpiry?: Date;

  @Prop({ default: false })
  isAnonymized: boolean = false;

  @Prop({ type: [String] })
  sensitiveDataMask?: string[];

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const AnalyticsEventSchema =
  SchemaFactory.createForClass(AnalyticsEvent);

// 创建复合索引提升查询性能
AnalyticsEventSchema.index({ sessionId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ eventType: 1, status: 1, timestamp: -1 });
AnalyticsEventSchema.index({ retentionExpiry: 1, status: 1 });
AnalyticsEventSchema.index({ timestamp: -1, eventCategory: 1 });
