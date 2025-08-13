import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ConsentStatus, UserPreferencesDto as UserPreferences } from '../../../../libs/shared-dtos/src';

export type UserProfileDocument = UserProfile & Document;

@Schema({
  collection: 'user_profiles',
  timestamps: true,
  versionKey: false
})
export class UserProfile {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  hashedPassword: string;

  @Prop()
  displayName?: string;

  @Prop()
  avatar?: string;

  @Prop({ type: Object })
  preferences?: UserPreferences;

  @Prop({ enum: Object.values(ConsentStatus), default: ConsentStatus.PENDING })
  dataProcessingConsent: ConsentStatus;

  @Prop({ enum: Object.values(ConsentStatus), default: ConsentStatus.PENDING })
  marketingConsent: ConsentStatus;

  @Prop({ enum: Object.values(ConsentStatus), default: ConsentStatus.PENDING })
  analyticsConsent: ConsentStatus;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  emailVerifiedAt?: Date;

  @Prop({ type: Object })
  sessionInfo?: {
    currentSessionId?: string;
    lastActivity?: Date;
    deviceInfo?: {
      userAgent: string;
      ipAddress: string;
      location?: string;
    };
  };

  @Prop({ type: [String], default: [] })
  tags: string[];

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
  };

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);

// 创建索引
UserProfileSchema.index({ email: 1 });
UserProfileSchema.index({ isActive: 1, lastLoginAt: -1 });
UserProfileSchema.index({ 'sessionInfo.currentSessionId': 1 });