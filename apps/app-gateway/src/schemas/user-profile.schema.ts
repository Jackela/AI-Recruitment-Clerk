import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';
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
  @Prop({ required: true, unique: true, type: String })
  public userId!: string;

  @Prop({ required: true, type: String })
  public email!: string;

  @Prop({ required: true, type: String })
  public hashedPassword!: string;

  @Prop({ type: String })
  public displayName?: string;

  @Prop({ type: String })
  public avatar?: string;

  @Prop({ type: Object })
  public preferences?: UserPreferencesDto;

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    default: ConsentStatus.PENDING,
  })
  public dataProcessingConsent!: ConsentStatus;

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    default: ConsentStatus.PENDING,
  })
  public marketingConsent!: ConsentStatus;

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    default: ConsentStatus.PENDING,
  })
  public analyticsConsent!: ConsentStatus;

  @Prop({ default: true, type: Boolean })
  public isActive!: boolean;

  @Prop({ type: Date })
  public lastLoginAt?: Date;

  @Prop({ type: Date })
  public emailVerifiedAt?: Date;

  @Prop({ type: Object })
  public sessionInfo?: {
    currentSessionId?: string;
    lastActivity?: Date;
    deviceInfo?: {
      userAgent: string;
      ipAddress: string;
      location?: string;
    };
  };

  @Prop({ type: [String], default: [] })
  public tags!: string[];

  @Prop({ type: Object })
  public mfaSettings?: {
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
  public metadata?: Record<string, unknown>;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);

// 创建索引
UserProfileSchema.index({ email: 1 });
UserProfileSchema.index({ isActive: 1, lastLoginAt: -1 });
UserProfileSchema.index({ 'sessionInfo.currentSessionId': 1 });
