import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsDateString,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * GDPR Data Subject Rights DTOs
 * Implements Articles 15-21 of GDPR for automated rights fulfillment
 */

export enum DataSubjectRightType {
  ACCESS = 'access', // Article 15 - Right to access
  RECTIFICATION = 'rectification', // Article 16 - Right to rectification
  ERASURE = 'erasure', // Article 17 - Right to erasure
  PORTABILITY = 'portability', // Article 20 - Right to data portability
  OBJECTION = 'objection', // Article 21 - Right to object
  RESTRICT_PROCESSING = 'restrict_processing', // Article 18 - Right to restrict processing
}

export enum RequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  PARTIALLY_COMPLETED = 'partially_completed',
  CANCELLED = 'cancelled',
}

export enum IdentityVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  NOT_REQUIRED = 'not_required',
}

export enum DataExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  XML = 'xml',
}

/**
 * Base data subject rights request
 */
export class DataSubjectRightsRequest {
  @IsUUID()
  id!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(DataSubjectRightType)
  requestType!: DataSubjectRightType;

  @IsEnum(RequestStatus)
  status!: RequestStatus;

  @IsEnum(IdentityVerificationStatus)
  identityVerificationStatus!: IdentityVerificationStatus;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  requestDate!: Date;

  @IsDateString()
  @IsOptional()
  completionDate?: Date;

  @IsDateString()
  @IsOptional()
  dueDate?: Date; // 30 days from request per GDPR

  @IsString()
  @IsOptional()
  processorNotes?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Data access request (Article 15)
 */
export class DataAccessRequest extends DataSubjectRightsRequest {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specificDataCategories?: string[]; // Specific categories requested

  @IsEnum(DataExportFormat)
  @IsOptional()
  preferredFormat?: DataExportFormat;

  @IsBoolean()
  @IsOptional()
  includeThirdPartyData?: boolean;

  @IsBoolean()
  @IsOptional()
  includeProcessingHistory?: boolean;
}

/**
 * Data rectification request (Article 16)
 */
export class DataRectificationRequest extends DataSubjectRightsRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldCorrectionDto)
  corrections!: FieldCorrectionDto[];

  @IsString()
  @IsOptional()
  justification?: string;
}

/**
 * Describes the field correction data transfer object.
 */
export class FieldCorrectionDto {
  @IsString()
  @IsNotEmpty()
  fieldPath!: string; // e.g., 'profile.firstName', 'resume.contactInfo.email'

  @IsOptional()
  currentValue?: any;

  @IsOptional()
  newValue?: any;

  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * Data erasure request (Article 17 - Right to be forgotten)
 */
export class DataErasureRequest extends DataSubjectRightsRequest {
  @IsEnum([
    'withdrawal_of_consent',
    'no_longer_necessary',
    'unlawful_processing',
    'legal_obligation',
    'public_interest',
  ])
  @IsOptional()
  erasureGround?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specificDataCategories?: string[];

  @IsBoolean()
  @IsOptional()
  retainForLegalReasons?: boolean;

  @IsString()
  @IsOptional()
  legalRetentionReason?: string;

  @IsBoolean()
  @IsOptional()
  anonymizeInsteadOfDelete?: boolean;
}

/**
 * Data portability request (Article 20)
 */
export class DataPortabilityRequest extends DataSubjectRightsRequest {
  @IsEnum(DataExportFormat)
  format!: DataExportFormat;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specificDataCategories?: string[];

  @IsString()
  @IsOptional()
  targetController?: string; // If transferring to another controller

  @IsBoolean()
  @IsOptional()
  machineReadableFormat?: boolean;

  @IsString()
  @IsOptional()
  downloadUrl?: string; // Generated download link

  @IsDateString()
  @IsOptional()
  downloadExpiry?: Date;
}

/**
 * Processing objection request (Article 21)
 */
export class ProcessingObjectionRequest extends DataSubjectRightsRequest {
  @IsArray()
  @IsString({ each: true })
  processingPurposes!: string[]; // Purposes being objected to

  @IsString()
  @IsOptional()
  objectionReason?: string;

  @IsBoolean()
  @IsOptional()
  objectToDirectMarketing?: boolean;

  @IsBoolean()
  @IsOptional()
  objectToAutomatedDecisionMaking?: boolean;
}

/**
 * Processing restriction request (Article 18)
 */
export class ProcessingRestrictionRequest extends DataSubjectRightsRequest {
  @IsEnum([
    'accuracy_contested',
    'processing_unlawful',
    'no_longer_needed',
    'objection_pending',
  ])
  restrictionGround!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specificProcessingActivities?: string[];

  @IsDateString()
  @IsOptional()
  restrictionEndDate?: Date;
}

/**
 * Create rights request DTO
 */
export class CreateRightsRequestDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(DataSubjectRightType)
  requestType!: DataSubjectRightType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  requestDetails?: any; // Type-specific details

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;
}

/**
 * Identity verification for rights requests
 */
export class IdentityVerificationDto {
  @IsUUID()
  requestId!: string;

  @IsEnum([
    'email_verification',
    'phone_verification',
    'document_upload',
    'security_questions',
  ])
  verificationType!: string;

  @IsOptional()
  verificationData?: any;

  @IsString()
  @IsOptional()
  verificationCode?: string;

  @IsDateString()
  @IsOptional()
  verificationExpiry?: Date;
}

/**
 * Rights request processing update
 */
export class ProcessRightsRequestDto {
  @IsUUID()
  requestId!: string;

  @IsEnum(RequestStatus)
  status!: RequestStatus;

  @IsString()
  @IsOptional()
  processorNotes?: string;

  @IsOptional()
  completionData?: any; // Results of the request processing

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

/**
 * Data export package structure
 */
export class DataExportPackage {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  requestId!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(DataExportFormat)
  format!: DataExportFormat;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataCategoryExport)
  dataCategories!: DataCategoryExport[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataCategoryExport)
  @IsOptional()
  data?: DataCategoryExport[];

  @IsOptional()
  metadata?: {
    exportDate: Date;
    dataController: string;
    privacyPolicyVersion: string;
    retentionPolicies: Record<string, string>;
    thirdPartyProcessors: string[];
  };

  @IsString()
  @IsOptional()
  downloadUrl?: string;

  @IsDateString()
  @IsOptional()
  urlExpiry?: Date;

  @IsNumber()
  @IsOptional()
  fileSizeBytes?: number;

  createdAt!: Date;
}

/**
 * Represents the data category export.
 */
export class DataCategoryExport {
  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  data!: any;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sources?: string[]; // Which services/systems this data came from

  @IsString()
  @IsOptional()
  legalBasis?: string;

  @IsString()
  @IsOptional()
  retentionPeriod?: string;

  @IsDateString()
  @IsOptional()
  collectionDate?: Date;

  @IsDateString()
  @IsOptional()
  lastModified?: Date;
}

/**
 * Rights request status query
 */
export class RightsRequestStatusDto {
  @IsUUID()
  requestId!: string;

  @IsEnum(DataSubjectRightType)
  requestType!: DataSubjectRightType;

  @IsEnum(RequestStatus)
  status!: RequestStatus;

  @IsEnum(IdentityVerificationStatus)
  identityVerificationStatus!: IdentityVerificationStatus;

  @IsDateString()
  requestDate!: Date;

  @IsDateString()
  @IsOptional()
  dueDate?: Date;

  @IsDateString()
  @IsOptional()
  completionDate?: Date;

  @IsString()
  @IsOptional()
  statusMessage?: string;

  @IsOptional()
  completionData?: any;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestActivityLog)
  @IsOptional()
  activityLog?: RequestActivityLog[];
}

/**
 * Represents the request activity log.
 */
export class RequestActivityLog {
  @IsDateString()
  timestamp!: Date;

  @IsString()
  @IsNotEmpty()
  action!: string;

  @IsString()
  @IsOptional()
  performedBy?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(RequestStatus)
  @IsOptional()
  statusChange?: RequestStatus;
}

/**
 * Bulk rights processing for admin operations
 */
export class BulkRightsProcessingDto {
  @IsArray()
  @IsUUID(4, { each: true })
  requestIds!: string[];

  @IsEnum(RequestStatus)
  action!: RequestStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  performedBy?: string;
}

/**
 * Rights fulfillment metrics
 */
export class RightsFulfillmentMetrics {
  @IsDateString()
  periodStart!: Date;

  @IsDateString()
  periodEnd!: Date;

  @IsOptional()
  requestCounts?: {
    total: number;
    byType: Record<DataSubjectRightType, number>;
    byStatus: Record<RequestStatus, number>;
  };

  @IsOptional()
  processingTimes?: {
    averageCompletionDays: number;
    medianCompletionDays: number;
    withinLegalDeadline: number;
    overdueCout: number;
  };

  @IsOptional()
  identityVerification?: {
    verificationRate: number;
    averageVerificationTime: number;
    failureRate: number;
  };

  @IsOptional()
  dataExports?: {
    totalExports: number;
    averageExportSize: number;
    formatBreakdown: Record<DataExportFormat, number>;
  };
}

/**
 * Automated rights processing rules
 */
export class AutomatedRightsRule {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsEnum(DataSubjectRightType)
  requestType!: DataSubjectRightType;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  conditions?: {
    userRole?: string[];
    dataCategories?: string[];
    requestReason?: string[];
    minimumAccountAge?: number;
  };

  @IsOptional()
  actions?: {
    autoApprove?: boolean;
    requireVerification?: boolean;
    notifyAdministrator?: boolean;
    applyRestrictions?: boolean;
  };

  @IsBoolean()
  isActive!: boolean;

  @IsDateString()
  createdAt!: Date;

  @IsDateString()
  @IsOptional()
  lastModified?: Date;
}
