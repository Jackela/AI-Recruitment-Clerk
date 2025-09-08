import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  DataSubjectRightType,
  RequestStatus,
  IdentityVerificationStatus,
  DataExportFormat,
} from '../common/interfaces/fallback-types';

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
  @Prop({ required: true, unique: true, index: true })
  id: string = '';

  @Prop({ required: true })
  userId: string = '';

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

  @Prop({ required: false })
  description?: string = undefined;

  @Prop({ required: true })
  requestDate: Date = new Date();

  @Prop({ required: false })
  completionDate?: Date = undefined;

  @Prop({ required: true })
  dueDate: Date = new Date(); // 30 days from request per GDPR

  @Prop({ required: false })
  processorNotes?: string = undefined;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any> = {};

  @Prop({ required: false })
  ipAddress?: string = undefined;

  @Prop({ required: false })
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

  @Prop({ required: false })
  includeThirdPartyData?: boolean = undefined; // For access requests

  @Prop({ required: false })
  includeProcessingHistory?: boolean = undefined; // For access requests

  // Rectification request fields
  @Prop({ type: Object, required: false })
  correctionData?: any = undefined; // Field corrections for rectification

  // Erasure request fields
  @Prop({ required: false })
  erasureGround?: string = undefined; // Legal ground for erasure

  @Prop({ required: false })
  retainForLegalReasons?: boolean = undefined;

  @Prop({ required: false })
  legalRetentionReason?: string = undefined;

  // Objection request fields
  @Prop({ type: [String], required: false })
  processingPurposes?: string[] = undefined; // Purposes being objected to

  @Prop({ required: false })
  objectionReason?: string = undefined;

  // Processing results
  @Prop({ required: false })
  downloadUrl?: string = undefined; // For data export requests

  @Prop({ required: false })
  downloadExpiry?: Date = undefined;

  @Prop({ required: false })
  exportFileSize?: number = undefined; // In bytes

  @Prop({ required: false })
  rejectionReason?: string = undefined;

  @Prop({ default: Date.now })
  createdAt: Date = new Date();

  @Prop({ default: Date.now })
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

@Schema({
  collection: 'rights_request_activities',
  timestamps: true,
  versionKey: false,
})
export class RightsRequestActivity {
  @Prop({ required: true })
  requestId: string = '';

  @Prop({ required: true })
  action: string = ''; // 'created', 'status_changed', 'verified', 'processed', etc.

  @Prop({ required: false })
  performedBy?: string = undefined; // User ID or 'system'

  @Prop({ required: false })
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
  metadata?: Record<string, any> = {};

  @Prop({ required: true })
  timestamp: Date = new Date();

  @Prop({ default: Date.now })
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

@Schema({
  collection: 'data_export_packages',
  timestamps: true,
  versionKey: false,
})
export class DataExportPackage {
  @Prop({ required: true, unique: true, index: true })
  requestId: string = '';

  @Prop({ required: true })
  userId: string = '';

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

  @Prop({ required: true })
  downloadUrl: string = '';

  @Prop({ required: true })
  urlExpiry: Date = new Date();

  @Prop({ required: true })
  fileSizeBytes: number = 0;

  @Prop({ required: false })
  checksumMD5?: string = undefined; // File integrity verification

  @Prop({ required: false })
  encryptionKey?: string = undefined; // If file is encrypted

  @Prop({ required: false, default: 0 })
  downloadCount: number = 0;

  @Prop({ required: false })
  lastDownloadAt?: Date = undefined;

  @Prop({ default: Date.now })
  createdAt: Date = new Date();

  @Prop({ default: Date.now })
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

@Schema({
  collection: 'identity_verifications',
  timestamps: true,
  versionKey: false,
})
export class IdentityVerification {
  @Prop({ required: true, unique: true, index: true })
  id: string = '';

  @Prop({ required: true })
  requestId: string = '';

  @Prop({ required: true })
  userId: string = '';

  @Prop({ required: true })
  verificationType: string = ''; // 'email', 'phone', 'document', 'security_questions'

  @Prop({
    type: String,
    enum: Object.values(IdentityVerificationStatus),
    required: true,
    default: IdentityVerificationStatus.PENDING,
  })
  status: IdentityVerificationStatus = IdentityVerificationStatus.PENDING;

  @Prop({ type: Object, default: {} })
  verificationData?: any = {}; // Method-specific verification data

  @Prop({ required: false })
  verificationCode?: string = undefined; // For email/SMS verification

  @Prop({ required: false })
  verificationExpiry?: Date = undefined;

  @Prop({ required: false })
  verificationAttempts?: number = undefined;

  @Prop({ required: false })
  maxAttempts?: number = undefined;

  @Prop({ required: false })
  verifiedAt?: Date = undefined;

  @Prop({ required: false })
  failureReason?: string = undefined;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any> = {};

  @Prop({ default: Date.now })
  createdAt: Date = new Date();

  @Prop({ default: Date.now })
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
