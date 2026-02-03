import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';
import {
  DataSubjectRightType,
  RequestStatus,
  IdentityVerificationStatus,
  DataExportFormat,
} from '@ai-recruitment-clerk/shared-dtos';

export type DataSubjectRightsRequestDocument = DataSubjectRightsRequest &
  Document;

/**
 * Data Subject Rights Request Schema
 * Manages GDPR data subject rights requests (Articles 15-21)
 */
@Schema({
  collection: 'data_subject_rights_requests',
  timestamps: true,
  versionKey: false,
})
export class DataSubjectRightsRequest {
  @Prop({ required: true, unique: true, index: true, type: String })
  public id = '';

  @Prop({ required: true, type: String })
  public userId = '';

  @Prop({
    type: String,
    enum: Object.values(DataSubjectRightType),
    required: true,
    index: true,
  })
  public requestType: DataSubjectRightType = DataSubjectRightType.ACCESS;

  @Prop({
    type: String,
    enum: Object.values(RequestStatus),
    required: true,
    index: true,
    default: RequestStatus.PENDING,
  })
  public status: RequestStatus = RequestStatus.PENDING;

  @Prop({
    type: String,
    enum: Object.values(IdentityVerificationStatus),
    required: true,
    default: IdentityVerificationStatus.PENDING,
  })
  public identityVerificationStatus: IdentityVerificationStatus =
    IdentityVerificationStatus.PENDING;

  @Prop({ required: false, type: String })
  public description?: string;

  @Prop({ required: true, type: Date })
  public requestDate: Date = new Date();

  @Prop({ required: false, type: Date })
  public completionDate?: Date;

  @Prop({ required: true, type: Date })
  public dueDate: Date = new Date(); // 30 days from request per GDPR

  @Prop({ required: false, type: String })
  public processorNotes?: string;

  @Prop({ type: Object, default: {} })
  public metadata?: Record<string, unknown>;

  @Prop({ required: false, type: String })
  public ipAddress?: string;

  @Prop({ required: false, type: String })
  public userAgent?: string;

  // Request-specific fields
  @Prop({ type: [String], required: false })
  public specificDataCategories?: string[]; // For access/portability requests

  @Prop({
    type: String,
    enum: Object.values(DataExportFormat),
    required: false,
  })
  public preferredFormat?: DataExportFormat; // For access/portability requests

  @Prop({ required: false, type: Boolean })
  public includeThirdPartyData?: boolean; // For access requests

  @Prop({ required: false, type: Boolean })
  public includeProcessingHistory?: boolean; // For access requests

  // Rectification request fields
  @Prop({ type: Object, required: false })
  public correctionData?: Record<string, unknown>; // Field corrections for rectification

  // Erasure request fields
  @Prop({ required: false, type: String })
  public erasureGround?: string; // Legal ground for erasure

  @Prop({ required: false, type: Boolean })
  public retainForLegalReasons?: boolean;

  @Prop({ required: false, type: String })
  public legalRetentionReason?: string;

  // Objection request fields
  @Prop({ type: [String], required: false })
  public processingPurposes?: string[]; // Purposes being objected to

  @Prop({ required: false, type: String })
  public objectionReason?: string;

  // Processing results
  @Prop({ required: false, type: String })
  public downloadUrl?: string; // For data export requests

  @Prop({ required: false, type: Date })
  public downloadExpiry?: Date;

  @Prop({ required: false, type: Number })
  public exportFileSize?: number; // In bytes

  @Prop({ required: false, type: String })
  public rejectionReason?: string;

  @Prop({ default: Date.now, type: Date })
  public createdAt: Date = new Date();

  @Prop({ default: Date.now, type: Date })
  public updatedAt: Date = new Date();
}

export const DataSubjectRightsRequestSchema = SchemaFactory.createForClass(
  DataSubjectRightsRequest,
);

// Create indexes for efficient querying
DataSubjectRightsRequestSchema.index({ userId: 1, requestType: 1 });
DataSubjectRightsRequestSchema.index({ status: 1, dueDate: 1 });
DataSubjectRightsRequestSchema.index({ requestDate: -1 });
DataSubjectRightsRequestSchema.index(
  { dueDate: 1 },
  {
    partialFilterExpression: {
      status: { $in: [RequestStatus.PENDING, RequestStatus.IN_PROGRESS] },
    },
  },
);

// Pre-save middleware to update timestamps and calculate due dates
DataSubjectRightsRequestSchema.pre('save', function (next) {
  this.updatedAt = new Date();

  // Set due date to 30 days from request date if not set
  if (this.isNew && !this.dueDate) {
    const dueDate = new Date(this.requestDate);
    dueDate.setDate(dueDate.getDate() + 30);
    this.dueDate = dueDate;
  }

  // Set completion date when status changes to completed
  if (
    this.isModified('status') &&
    this.status === RequestStatus.COMPLETED &&
    !this.completionDate
  ) {
    this.completionDate = new Date();
  }

  next();
});

/**
 * Rights Request Activity Log Schema
 * Tracks all activities and status changes for rights requests
 */
export type RightsRequestActivityDocument = RightsRequestActivity & Document;

/**
 * Represents the rights request activity.
 */
@Schema({
  collection: 'rights_request_activities',
  timestamps: true,
  versionKey: false,
})
export class RightsRequestActivity {
  @Prop({ required: true, type: String })
  public requestId = '';

  @Prop({ required: true, type: String })
  public action = ''; // 'created', 'status_changed', 'verified', 'processed', etc.

  @Prop({ required: false, type: String })
  public performedBy?: string; // User ID or 'system'

  @Prop({ required: false, type: String })
  public notes?: string;

  @Prop({
    type: String,
    enum: Object.values(RequestStatus),
    required: false,
  })
  public previousStatus?: RequestStatus;

  @Prop({
    type: String,
    enum: Object.values(RequestStatus),
    required: false,
  })
  public newStatus?: RequestStatus;

  @Prop({ type: Object, default: {} })
  public metadata?: Record<string, unknown>;

  @Prop({ required: true, type: Date })
  public timestamp: Date = new Date();

  @Prop({ default: Date.now, type: Date })
  public createdAt: Date = new Date();
}

export const RightsRequestActivitySchema = SchemaFactory.createForClass(
  RightsRequestActivity,
);

// Create indexes
RightsRequestActivitySchema.index({ requestId: 1, timestamp: -1 });
RightsRequestActivitySchema.index({ action: 1, timestamp: -1 });
RightsRequestActivitySchema.index({ timestamp: -1 });

/**
 * Data Export Package Schema
 * Stores metadata about data export packages for portability/access requests
 */
export type DataExportPackageDocument = DataExportPackage & Document;

/**
 * Represents the data export package.
 */
@Schema({
  collection: 'data_export_packages',
  timestamps: true,
  versionKey: false,
})
export class DataExportPackage {
  @Prop({ required: true, unique: true, index: true, type: String })
  public requestId = '';

  @Prop({ required: true, type: String })
  public userId = '';

  @Prop({
    type: String,
    enum: Object.values(DataExportFormat),
    required: true,
  })
  public format: DataExportFormat = DataExportFormat.JSON;

  @Prop({ type: Object, required: true })
  public packageManifest: {
    dataCategories: Array<{
      category: string;
      description: string;
      recordCount: number;
      sources: string[];
      legalBasis: string;
      retentionPeriod: string;
    }>;
    exportDate: Date;
    dataController: string;
    privacyPolicyVersion: string;
    retentionPolicies: Record<string, string>;
    thirdPartyProcessors: string[];
  } = {
    dataCategories: [],
    exportDate: new Date(),
    dataController: '',
    privacyPolicyVersion: '',
    retentionPolicies: {},
    thirdPartyProcessors: [],
  };

  @Prop({ required: true, type: String })
  public downloadUrl = '';

  @Prop({ required: true, type: Date })
  public urlExpiry: Date = new Date();

  @Prop({ required: true, type: Number })
  public fileSizeBytes = 0;

  @Prop({ required: false, type: String })
  public checksumMD5?: string; // File integrity verification

  @Prop({ required: false, type: String })
  public encryptionKey?: string; // If file is encrypted

  @Prop({ required: false, default: 0, type: Number })
  public downloadCount = 0;

  @Prop({ required: false, type: Date })
  public lastDownloadAt?: Date;

  @Prop({ default: Date.now, type: Date })
  public createdAt: Date = new Date();

  @Prop({ default: Date.now, type: Date })
  public updatedAt: Date = new Date();
}

export const DataExportPackageSchema =
  SchemaFactory.createForClass(DataExportPackage);

// Create indexes
DataExportPackageSchema.index({ requestId: 1 }, { unique: true });
DataExportPackageSchema.index({ userId: 1 });
DataExportPackageSchema.index({ urlExpiry: 1 });
DataExportPackageSchema.index({ createdAt: -1 });

// Pre-save middleware to update timestamps
DataExportPackageSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

/**
 * Identity Verification Schema
 * Manages identity verification for rights requests
 */
export type IdentityVerificationDocument = IdentityVerification & Document;

/**
 * Represents the identity verification.
 */
@Schema({
  collection: 'identity_verifications',
  timestamps: true,
  versionKey: false,
})
export class IdentityVerification {
  @Prop({ required: true, unique: true, index: true, type: String })
  public id = '';

  @Prop({ required: true, type: String })
  public requestId = '';

  @Prop({ required: true, type: String })
  public userId = '';

  @Prop({ required: true, type: String })
  public verificationType = ''; // 'email', 'phone', 'document', 'security_questions'

  @Prop({
    type: String,
    enum: Object.values(IdentityVerificationStatus),
    required: true,
    default: IdentityVerificationStatus.PENDING,
  })
  public status: IdentityVerificationStatus = IdentityVerificationStatus.PENDING;

  @Prop({ type: Object, default: {} })
  public verificationData?: Record<string, unknown>; // Method-specific verification data

  @Prop({ required: false, type: String })
  public verificationCode?: string; // For email/SMS verification

  @Prop({ required: false, type: Date })
  public verificationExpiry?: Date;

  @Prop({ required: false, type: Number })
  public verificationAttempts?: number;

  @Prop({ required: false, type: Number })
  public maxAttempts?: number;

  @Prop({ required: false, type: Date })
  public verifiedAt?: Date;

  @Prop({ required: false, type: String })
  public failureReason?: string;

  @Prop({ type: Object, default: {} })
  public metadata?: Record<string, unknown>;

  @Prop({ default: Date.now, type: Date })
  public createdAt: Date = new Date();

  @Prop({ default: Date.now, type: Date })
  public updatedAt: Date = new Date();
}

export const IdentityVerificationSchema =
  SchemaFactory.createForClass(IdentityVerification);

// Create indexes
IdentityVerificationSchema.index({ requestId: 1 });
IdentityVerificationSchema.index({ userId: 1, status: 1 });
IdentityVerificationSchema.index({ verificationExpiry: 1 }, { sparse: true });
IdentityVerificationSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware
IdentityVerificationSchema.pre('save', function (next) {
  this.updatedAt = new Date();

  // Set verification expiry if not provided (24 hours for codes)
  if (this.isNew && this.verificationCode && !this.verificationExpiry) {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    this.verificationExpiry = expiry;
  }

  // Set verified timestamp when status changes to verified
  if (
    this.isModified('status') &&
    this.status === IdentityVerificationStatus.VERIFIED &&
    !this.verifiedAt
  ) {
    this.verifiedAt = new Date();
  }

  next();
});
