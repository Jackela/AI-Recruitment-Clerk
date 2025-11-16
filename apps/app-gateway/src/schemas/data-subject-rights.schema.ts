import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
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
  @Prop({ type: String, required: true, unique: true, index: true })
  id = '';

  @Prop({ type: String, required: true })
  userId = '';

  @Prop({
    type: String,
    enum: Object.values(DataSubjectRightType),
    required: true,
    index: true,
  })
  requestType: DataSubjectRightType = DataSubjectRightType.ACCESS;

  @Prop({
    type: String,
    enum: Object.values(RequestStatus),
    required: true,
    index: true,
    default: RequestStatus.PENDING,
  })
  status: RequestStatus = RequestStatus.PENDING;

  @Prop({
    type: String,
    enum: Object.values(IdentityVerificationStatus),
    required: true,
    default: IdentityVerificationStatus.PENDING,
  })
  identityVerificationStatus: IdentityVerificationStatus =
    IdentityVerificationStatus.PENDING;

  @Prop({ type: String, required: false })
  description?: string = undefined;

  @Prop({ type: Date, required: true })
  requestDate: Date = new Date();

  @Prop({ type: Date, required: false })
  completionDate?: Date = undefined;

  @Prop({ type: Date, required: true })
  dueDate: Date = new Date(); // 30 days from request per GDPR

  @Prop({ type: String, required: false })
  processorNotes?: string = undefined;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown> = {};

  @Prop({ type: String, required: false })
  ipAddress?: string = undefined;

  @Prop({ type: String, required: false })
  userAgent?: string = undefined;

  // Request-specific fields
  @Prop({ type: [String], required: false })
  specificDataCategories?: string[] = undefined; // For access/portability requests

  @Prop({
    type: String,
    enum: Object.values(DataExportFormat),
    required: false,
  })
  preferredFormat?: DataExportFormat = undefined; // For access/portability requests

  @Prop({ type: Boolean, required: false })
  includeThirdPartyData?: boolean = undefined; // For access requests

  @Prop({ type: Boolean, required: false })
  includeProcessingHistory?: boolean = undefined; // For access requests

  // Rectification request fields
  @Prop({ type: Object, required: false })
  correctionData?: Record<string, unknown> = undefined; // Field corrections for rectification

  // Erasure request fields
  @Prop({ type: String, required: false })
  erasureGround?: string = undefined; // Legal ground for erasure

  @Prop({ type: Boolean, required: false })
  retainForLegalReasons?: boolean = undefined;

  @Prop({ type: String, required: false })
  legalRetentionReason?: string = undefined;

  // Objection request fields
  @Prop({ type: [String], required: false })
  processingPurposes?: string[] = undefined; // Purposes being objected to

  @Prop({ type: String, required: false })
  objectionReason?: string = undefined;

  // Processing results
  @Prop({ type: String, required: false })
  downloadUrl?: string = undefined; // For data export requests

  @Prop({ type: Date, required: false })
  downloadExpiry?: Date = undefined;

  @Prop({ type: Number, required: false })
  exportFileSize?: number = undefined; // In bytes

  @Prop({ type: String, required: false })
  rejectionReason?: string = undefined;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date = new Date();

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date = new Date();
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
  @Prop({ type: String, required: true })
  requestId = '';

  @Prop({ type: String, required: true })
  action = ''; // 'created', 'status_changed', 'verified', 'processed', etc.

  @Prop({ type: String, required: false })
  performedBy?: string = undefined; // User ID or 'system'

  @Prop({ type: String, required: false })
  notes?: string = undefined;

  @Prop({
    type: String,
    enum: Object.values(RequestStatus),
    required: false,
  })
  previousStatus?: RequestStatus = undefined;

  @Prop({
    type: String,
    enum: Object.values(RequestStatus),
    required: false,
  })
  newStatus?: RequestStatus = undefined;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown> = {};

  @Prop({ type: Date, required: true })
  timestamp: Date = new Date();

  @Prop({ type: Date, default: Date.now })
  createdAt: Date = new Date();
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
  @Prop({ type: String, required: true, unique: true, index: true })
  requestId = '';

  @Prop({ type: String, required: true })
  userId = '';

  @Prop({
    type: String,
    enum: Object.values(DataExportFormat),
    required: true,
  })
  format: DataExportFormat = DataExportFormat.JSON;

  @Prop({ type: Object, required: true })
  packageManifest: {
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

  @Prop({ type: String, required: true })
  downloadUrl = '';

  @Prop({ type: Date, required: true })
  urlExpiry: Date = new Date();

  @Prop({ type: Number, required: true })
  fileSizeBytes = 0;

  @Prop({ type: String, required: false })
  checksumMD5?: string = undefined; // File integrity verification

  @Prop({ type: String, required: false })
  encryptionKey?: string = undefined; // If file is encrypted

  @Prop({ type: Number, required: false, default: 0 })
  downloadCount = 0;

  @Prop({ type: Date, required: false })
  lastDownloadAt?: Date = undefined;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date = new Date();

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date = new Date();
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
  @Prop({ type: String, required: true, unique: true, index: true })
  id = '';

  @Prop({ type: String, required: true })
  requestId = '';

  @Prop({ type: String, required: true })
  userId = '';

  @Prop({ type: String, required: true })
  verificationType = ''; // 'email', 'phone', 'document', 'security_questions'

  @Prop({
    type: String,
    enum: Object.values(IdentityVerificationStatus),
    required: true,
    default: IdentityVerificationStatus.PENDING,
  })
  status: IdentityVerificationStatus = IdentityVerificationStatus.PENDING;

  @Prop({ type: Object, default: {} })
  verificationData?: Record<string, unknown> = {}; // Method-specific verification data

  @Prop({ type: String, required: false })
  verificationCode?: string = undefined; // For email/SMS verification

  @Prop({ type: Date, required: false })
  verificationExpiry?: Date = undefined;

  @Prop({ type: Number, required: false })
  verificationAttempts?: number = undefined;

  @Prop({ type: Number, required: false })
  maxAttempts?: number = undefined;

  @Prop({ type: Date, required: false })
  verifiedAt?: Date = undefined;

  @Prop({ type: String, required: false })
  failureReason?: string = undefined;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown> = {};

  @Prop({ type: Date, default: Date.now })
  createdAt: Date = new Date();

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date = new Date();
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
