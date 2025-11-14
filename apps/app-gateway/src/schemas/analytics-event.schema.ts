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
  @Prop({ type: String, required: true, unique: true, index: true })
  eventId = '';

  @Prop({ type: String, required: true })
  sessionId = '';

  @Prop({ type: String })
  userId?: string = undefined;

  @Prop({ type: String, required: true, enum: Object.values(EventType) })
  eventType: EventType = EventType.USER_INTERACTION;

  @Prop({ type: String, required: true, enum: Object.values(EventCategory) })
  eventCategory: EventCategory = EventCategory.SYSTEM;

  @Prop({ type: String, required: true, enum: Object.values(EventStatus) })
  status: EventStatus = EventStatus.PENDING_PROCESSING;

  @Prop({ type: Object, required: true })
  eventData: any = {};

  @Prop({ type: Object })
  context?: any = undefined;

  @Prop({ type: Date, required: true })
  timestamp: Date = new Date();

  @Prop({ type: Object })
  deviceInfo?: {
    userAgent: string;
    screenResolution: string;
    language: string;
    timezone: string;
  } = undefined;

  @Prop({ type: Object })
  geoLocation?: {
    country: string;
    region: string;
    city: string;
    latitude?: number;
    longitude?: number;
  } = undefined;

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    default: ConsentStatus.GRANTED,
  })
  consentStatus: ConsentStatus = ConsentStatus.GRANTED;

  @Prop({ type: Boolean, default: false })
  isSystemSession = false;

  @Prop({ type: Date })
  processedAt?: Date = undefined;

  @Prop({ type: Date })
  retentionExpiry?: Date = undefined;

  @Prop({ type: Boolean, default: false })
  isAnonymized = false;

  @Prop({ type: [String] })
  sensitiveDataMask?: string[] = undefined;

  @Prop({ type: Object })
  metadata?: Record<string, any> = undefined;
}

export const AnalyticsEventSchema =
  SchemaFactory.createForClass(AnalyticsEvent);

// 创建复合索引提升查询性能
AnalyticsEventSchema.index({ sessionId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ eventType: 1, status: 1, timestamp: -1 });
AnalyticsEventSchema.index({ retentionExpiry: 1, status: 1 });
AnalyticsEventSchema.index({ timestamp: -1, eventCategory: 1 });
