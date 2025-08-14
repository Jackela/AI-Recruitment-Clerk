import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EventType, EventStatus, EventCategory, ConsentStatus } from '../../../../libs/shared-dtos/src';

export type AnalyticsEventDocument = AnalyticsEvent & Document;

@Schema({
  collection: 'analytics_events',
  timestamps: true,
  versionKey: false
})
export class AnalyticsEvent {
  @Prop({ required: true, unique: true, index: true })
  eventId: string;

  @Prop({ required: true })
  sessionId: string;

  @Prop()
  userId?: string;

  @Prop({ type: String, required: true, enum: Object.values(EventType) })
  eventType: EventType;

  @Prop({ type: String, required: true, enum: Object.values(EventCategory) })
  eventCategory: EventCategory;

  @Prop({ type: String, required: true, enum: Object.values(EventStatus) })
  status: EventStatus;

  @Prop({ type: Object, required: true })
  eventData: any;

  @Prop({ type: Object })
  context?: any;

  @Prop({ required: true })
  timestamp: Date;

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

  @Prop({ type: String, enum: Object.values(ConsentStatus), default: ConsentStatus.GRANTED })
  consentStatus: ConsentStatus;

  @Prop({ default: false })
  isSystemSession: boolean;

  @Prop()
  processedAt?: Date;

  @Prop()
  retentionExpiry?: Date;

  @Prop({ default: false })
  isAnonymized: boolean;

  @Prop({ type: [String] })
  sensitiveDataMask?: string[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);

// 创建复合索引提升查询性能
AnalyticsEventSchema.index({ sessionId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
AnalyticsEventSchema.index({ eventType: 1, status: 1, timestamp: -1 });
AnalyticsEventSchema.index({ retentionExpiry: 1, status: 1 });
AnalyticsEventSchema.index({ timestamp: -1, eventCategory: 1 });