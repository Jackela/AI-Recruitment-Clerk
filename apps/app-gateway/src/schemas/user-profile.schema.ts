import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { UserPreferencesDto } from '@ai-recruitment-clerk/shared-dtos';
import { ConsentStatus } from './consent-record.schema';

export type UserProfileDocument = UserProfile & Document;

/**
 * Represents the user profile.
 */
@Schema({
  collection: 'user_profiles',
  timestamps: true,
  versionKey: false,
})
export class UserProfile {
  @Prop({ required: true, unique: true })
  userId: string = '';

  @Prop({ required: true })
  email: string = '';

  @Prop({ required: true })
  hashedPassword: string = '';

  @Prop()
  displayName?: string = undefined;

  @Prop()
  avatar?: string = undefined;

  @Prop({ type: Object })
  preferences?: UserPreferencesDto = undefined;

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    default: ConsentStatus.PENDING,
  })
  dataProcessingConsent: ConsentStatus = ConsentStatus.PENDING;

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    default: ConsentStatus.PENDING,
  })
  marketingConsent: ConsentStatus = ConsentStatus.PENDING;

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    default: ConsentStatus.PENDING,
  })
  analyticsConsent: ConsentStatus = ConsentStatus.PENDING;

  @Prop({ default: true })
  isActive: boolean = true;

  @Prop()
  lastLoginAt?: Date = undefined;

  @Prop()
  emailVerifiedAt?: Date = undefined;

  @Prop({ type: Object })
  sessionInfo?: {
    currentSessionId?: string;
    lastActivity?: Date;
    deviceInfo?: {
      userAgent: string;
      ipAddress: string;
      location?: string;
    };
  } = undefined;

  @Prop({ type: [String], default: [] })
  tags: string[] = [];

  @Prop({ type: Object })
  mfaSettings?: {
    enabled: boolean;
    methods: string[];
    totpSecret?: string;
    phoneNumber?: string;
    email?: string;
    backupCodes: string[];
    trustedDevices: string[];
    lastUsedAt?: Date;
    failedAttempts: number;
    lockedUntil?: Date;
  } = undefined;

  @Prop({ type: Object })
  metadata?: Record<string, any> = undefined;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);

// 创建索引
UserProfileSchema.index({ email: 1 });
UserProfileSchema.index({ isActive: 1, lastLoginAt: -1 });
UserProfileSchema.index({ 'sessionInfo.currentSessionId': 1 });
