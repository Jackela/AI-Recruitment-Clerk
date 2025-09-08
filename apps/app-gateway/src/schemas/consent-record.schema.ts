import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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
  @Prop({ required: true, unique: true, index: true })
  id: string = '';

  @Prop({ required: true })
  userId: string = '';

  @Prop({
    type: String,
    enum: Object.values(ConsentPurpose),
    required: true,
    index: true,
  })
  purpose: ConsentPurpose = ConsentPurpose.ESSENTIAL_SERVICES;

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    required: true,
    index: true,
  })
  status: ConsentStatus = ConsentStatus.PENDING;

  @Prop({
    type: String,
    enum: Object.values(ConsentMethod),
    required: false,
  })
  consentMethod?: ConsentMethod = undefined;

  @Prop({
    type: [{ type: String, enum: Object.values(DataCategory) }],
    default: [],
  })
  dataCategories: DataCategory[] = [];

  @Prop({ required: false })
  legalBasis?: string = undefined; // GDPR Article 6 legal basis

  @Prop({ required: true })
  consentDate: Date = new Date();

  @Prop({ required: false })
  withdrawalDate?: Date = undefined;

  @Prop({ required: false })
  expiryDate?: Date = undefined; // For time-limited consent

  @Prop({ required: false })
  consentText?: string = undefined; // Text presented to user

  @Prop({ required: false })
  withdrawalReason?: string = undefined;

  @Prop({ required: false })
  ipAddress?: string = undefined; // Proof of consent

  @Prop({ required: false })
  userAgent?: string = undefined; // Technical consent context

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any> = {};

  @Prop({ default: Date.now })
  createdAt: Date = new Date();

  @Prop({ default: Date.now })
  updatedAt: Date = new Date();
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

@Schema({
  collection: 'cookie_consents',
  timestamps: true,
  versionKey: false,
})
export class CookieConsent {
  @Prop({ required: true, unique: true })
  deviceId: string = '';

  @Prop({ required: true, default: true })
  essential: boolean = true; // Always true, cannot be denied

  @Prop({ required: true, default: false })
  functional: boolean = false;

  @Prop({ required: true, default: false })
  analytics: boolean = false;

  @Prop({ required: true, default: false })
  marketing: boolean = false;

  @Prop({ required: true })
  consentDate: Date = new Date();

  @Prop({ required: false })
  expiryDate?: Date = undefined;

  @Prop({ required: false, default: '1.0' })
  consentVersion?: string = '1.0';

  @Prop({ required: false })
  ipAddress?: string = undefined;

  @Prop({ required: false })
  userAgent?: string = undefined;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any> = {};

  @Prop({ default: Date.now })
  createdAt: Date = new Date();

  @Prop({ default: Date.now })
  updatedAt: Date = new Date();
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

@Schema({
  collection: 'consent_audit_logs',
  timestamps: true,
  versionKey: false,
})
export class ConsentAuditLog {
  @Prop({ required: true, unique: true, index: true })
  id: string = '';

  @Prop({ required: true })
  userId: string = '';

  @Prop({ required: true })
  action: string = ''; // 'grant', 'withdraw', 'renew', 'expire'

  @Prop({
    type: String,
    enum: Object.values(ConsentPurpose),
    required: true,
    index: true,
  })
  purpose: ConsentPurpose = ConsentPurpose.ESSENTIAL_SERVICES;

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    required: true,
  })
  previousStatus: ConsentStatus = ConsentStatus.PENDING;

  @Prop({
    type: String,
    enum: Object.values(ConsentStatus),
    required: true,
  })
  newStatus: ConsentStatus = ConsentStatus.PENDING;

  @Prop({ required: false })
  reason?: string = undefined;

  @Prop({ required: false })
  ipAddress?: string = undefined;

  @Prop({ required: false })
  userAgent?: string = undefined;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any> = {};

  @Prop({ required: true })
  timestamp: Date = new Date();

  @Prop({ default: Date.now })
  createdAt: Date = new Date();
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
