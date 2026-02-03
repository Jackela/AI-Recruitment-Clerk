import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

// Local fallback enums in case shared DTOs are not available
export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  PENDING = 'pending',
  WITHDRAWN = 'withdrawn',
  NOT_APPLICABLE = 'not_applicable',
}

export enum ConsentPurpose {
  ESSENTIAL_SERVICES = 'essential_services',
  FUNCTIONAL_ANALYTICS = 'functional_analytics',
  MARKETING_COMMUNICATIONS = 'marketing_communications',
  BEHAVIORAL_ANALYTICS = 'behavioral_analytics',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  PERSONALIZATION = 'personalization',
  PERFORMANCE_MONITORING = 'performance_monitoring',
}

export enum ConsentMethod {
  EXPLICIT_OPT_IN = 'explicit_opt_in',
  IMPLIED_CONSENT = 'implied_consent',
  GRANULAR_CHOICE = 'granular_choice',
  CONTINUED_USE = 'continued_use',
  LEGAL_REQUIREMENT = 'legal_requirement',
}

export enum DataCategory {
  AUTHENTICATION = 'authentication',
  PROFILE_INFORMATION = 'profile_information',
  RESUME_CONTENT = 'resume_content',
  JOB_PREFERENCES = 'job_preferences',
  BEHAVIORAL_DATA = 'behavioral_data',
  DEVICE_INFORMATION = 'device_information',
  COMMUNICATION_PREFERENCES = 'communication_preferences',
  SYSTEM_LOGS = 'system_logs',
}

export type ConsentRecordDocument = ConsentRecord & Document;

/**
 * Consent Record Schema
 * Stores individual consent records for GDPR compliance
 */
@Schema({
  collection: 'consent_records',
  timestamps: true,
  versionKey: false,
})
export class ConsentRecord {
  @Prop({ required: true, unique: true, index: true, type: String })
  public id = '';

  @Prop({ required: true, type: String })
  public userId = '';

  @Prop({
    type: String,
    enum: Object.values(ConsentPurpose),
    required: true,
    index: true,
  })
  public purpose: ConsentPurpose = ConsentPurpose.ESSENTIAL_SERVICES;

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    required: true,
    index: true,
  })
  public status: ConsentStatus = ConsentStatus.PENDING;

  @Prop({
    type: String,
    enum: Object.values(ConsentMethod),
    required: false,
  })
  public consentMethod?: ConsentMethod;

  @Prop({
    type: [{ type: String, enum: Object.values(DataCategory) }],
    default: [],
  })
  public dataCategories: DataCategory[] = [];

  @Prop({ required: false, type: String })
  public legalBasis?: string; // GDPR Article 6 legal basis

  @Prop({ required: true, type: Date })
  public consentDate: Date = new Date();

  @Prop({ required: false, type: Date })
  public withdrawalDate?: Date;

  @Prop({ required: false, type: Date })
  public expiryDate?: Date; // For time-limited consent

  @Prop({ required: false, type: String })
  public consentText?: string; // Text presented to user

  @Prop({ required: false, type: String })
  public withdrawalReason?: string;

  @Prop({ required: false, type: String })
  public ipAddress?: string; // Proof of consent

  @Prop({ required: false, type: String })
  public userAgent?: string; // Technical consent context

  @Prop({ type: Object, default: {} })
  public metadata?: Record<string, unknown>;

  @Prop({ default: Date.now, type: Date })
  public createdAt: Date = new Date();

  @Prop({ default: Date.now, type: Date })
  public updatedAt: Date = new Date();
}

export const ConsentRecordSchema = SchemaFactory.createForClass(ConsentRecord);

// Create indexes for efficient querying
ConsentRecordSchema.index({ userId: 1, purpose: 1 }, { unique: true });
ConsentRecordSchema.index({ userId: 1, status: 1 });
ConsentRecordSchema.index({ consentDate: -1 });
ConsentRecordSchema.index({ expiryDate: 1 }, { sparse: true });
ConsentRecordSchema.index({ status: 1, expiryDate: 1 });

// Pre-save middleware to update timestamps
ConsentRecordSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware to set withdrawal date when status changes to withdrawn
ConsentRecordSchema.pre('save', function (next) {
  if (
    this.isModified('status') &&
    this.status === ConsentStatus.WITHDRAWN &&
    !this.withdrawalDate
  ) {
    this.withdrawalDate = new Date();
  }
  next();
});

/**
 * Cookie Consent Schema
 * Stores cookie consent preferences for guest users
 */
export type CookieConsentDocument = CookieConsent & Document;

/**
 * Represents the cookie consent.
 */
@Schema({
  collection: 'cookie_consents',
  timestamps: true,
  versionKey: false,
})
export class CookieConsent {
  @Prop({ required: true, unique: true, type: String })
  public deviceId = '';

  @Prop({ required: true, default: true, type: Boolean })
  public essential = true; // Always true, cannot be denied

  @Prop({ required: true, default: false, type: Boolean })
  public functional = false;

  @Prop({ required: true, default: false, type: Boolean })
  public analytics = false;

  @Prop({ required: true, default: false, type: Boolean })
  public marketing = false;

  @Prop({ required: true, type: Date })
  public consentDate: Date = new Date();

  @Prop({ required: false, type: Date })
  public expiryDate?: Date;

  @Prop({ required: false, default: '1.0', type: String })
  public consentVersion = '1.0';

  @Prop({ required: false, type: String })
  public ipAddress?: string;

  @Prop({ required: false, type: String })
  public userAgent?: string;

  @Prop({ type: Object, default: {} })
  public metadata?: Record<string, unknown>;

  @Prop({ default: Date.now, type: Date })
  public createdAt: Date = new Date();

  @Prop({ default: Date.now, type: Date })
  public updatedAt: Date = new Date();
}

export const CookieConsentSchema = SchemaFactory.createForClass(CookieConsent);

// Create indexes
CookieConsentSchema.index({ deviceId: 1 }, { unique: true });
CookieConsentSchema.index({ consentDate: -1 });
CookieConsentSchema.index({ expiryDate: 1 }, { sparse: true });

// Pre-save middleware
CookieConsentSchema.pre('save', function (next) {
  this.updatedAt = new Date();

  // Set expiry date if not provided (1 year from consent)
  if (!this.expiryDate) {
    const expiryDate = new Date(this.consentDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    this.expiryDate = expiryDate;
  }

  next();
});

/**
 * Consent Audit Log Schema
 * Maintains audit trail of all consent-related actions
 */
export type ConsentAuditLogDocument = ConsentAuditLog & Document;

/**
 * Represents the consent audit log.
 */
@Schema({
  collection: 'consent_audit_logs',
  timestamps: true,
  versionKey: false,
})
export class ConsentAuditLog {
  @Prop({ required: true, unique: true, index: true, type: String })
  public id = '';

  @Prop({ required: true, type: String })
  public userId = '';

  @Prop({ required: true, type: String })
  public action = ''; // 'grant', 'withdraw', 'renew', 'expire'

  @Prop({
    type: String,
    enum: Object.values(ConsentPurpose),
    required: true,
    index: true,
  })
  public purpose: ConsentPurpose = ConsentPurpose.ESSENTIAL_SERVICES;

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    required: true,
  })
  public previousStatus: ConsentStatus = ConsentStatus.PENDING;

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    required: true,
  })
  public newStatus: ConsentStatus = ConsentStatus.PENDING;

  @Prop({ required: false, type: String })
  public reason?: string;

  @Prop({ required: false, type: String })
  public ipAddress?: string;

  @Prop({ required: false, type: String })
  public userAgent?: string;

  @Prop({ type: Object, default: {} })
  public metadata?: Record<string, unknown>;

  @Prop({ required: true, type: Date })
  public timestamp: Date = new Date();

  @Prop({ default: Date.now, type: Date })
  public createdAt: Date = new Date();
}

export const ConsentAuditLogSchema =
  SchemaFactory.createForClass(ConsentAuditLog);

// Create indexes for efficient querying
ConsentAuditLogSchema.index({ userId: 1, timestamp: -1 });
ConsentAuditLogSchema.index({ action: 1, timestamp: -1 });
ConsentAuditLogSchema.index({ purpose: 1, timestamp: -1 });
ConsentAuditLogSchema.index({ timestamp: -1 });

// Pre-save middleware
ConsentAuditLogSchema.pre('save', function (next) {
  if (!this.timestamp) {
    this.timestamp = new Date();
  }
  next();
});
