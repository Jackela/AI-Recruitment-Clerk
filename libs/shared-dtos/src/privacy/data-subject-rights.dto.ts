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
  public id!: string;

  @IsString()
  @IsNotEmpty()
  public userId!: string;

  @IsEnum(DataSubjectRightType)
  public requestType!: DataSubjectRightType;

  @IsEnum(RequestStatus)
  public status!: RequestStatus;

  @IsEnum(IdentityVerificationStatus)
  public identityVerificationStatus!: IdentityVerificationStatus;

  @IsString()
  @IsOptional()
  public description?: string;

  @IsDateString()
  public requestDate!: Date;

  @IsDateString()
  @IsOptional()
  public completionDate?: Date;

  @IsDateString()
  @IsOptional()
  public dueDate?: Date; // 30 days from request per GDPR

  @IsString()
  @IsOptional()
  public processorNotes?: string;

  @IsOptional()
  public metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  public ipAddress?: string;

  @IsString()
  @IsOptional()
  public userAgent?: string;

  public createdAt!: Date;
  public updatedAt!: Date;
}

/**
 * Data access request (Article 15)
 */
export class DataAccessRequest extends DataSubjectRightsRequest {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public specificDataCategories?: string[]; // Specific categories requested

  @IsEnum(DataExportFormat)
  @IsOptional()
  public preferredFormat?: DataExportFormat;

  @IsBoolean()
  @IsOptional()
  public includeThirdPartyData?: boolean;

  @IsBoolean()
  @IsOptional()
  public includeProcessingHistory?: boolean;
}

/**
 * Data rectification request (Article 16)
 */
export class DataRectificationRequest extends DataSubjectRightsRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldCorrectionDto)
  public corrections!: FieldCorrectionDto[];

  @IsString()
  @IsOptional()
  public justification?: string;
}

/**
 * Describes the field correction data transfer object.
 */
export class FieldCorrectionDto {
  @IsString()
  @IsNotEmpty()
  public fieldPath!: string; // e.g., 'profile.firstName', 'resume.contactInfo.email'

  @IsOptional()
  public currentValue?: unknown;

  @IsOptional()
  public newValue?: unknown;

  @IsString()
  @IsOptional()
  public reason?: string;
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
  public erasureGround?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public specificDataCategories?: string[];

  @IsBoolean()
  @IsOptional()
  public retainForLegalReasons?: boolean;

  @IsString()
  @IsOptional()
  public legalRetentionReason?: string;

  @IsBoolean()
  @IsOptional()
  public anonymizeInsteadOfDelete?: boolean;
}

/**
 * Data portability request (Article 20)
 */
export class DataPortabilityRequest extends DataSubjectRightsRequest {
  @IsEnum(DataExportFormat)
  public format!: DataExportFormat;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public specificDataCategories?: string[];

  @IsString()
  @IsOptional()
  public targetController?: string; // If transferring to another controller

  @IsBoolean()
  @IsOptional()
  public machineReadableFormat?: boolean;

  @IsString()
  @IsOptional()
  public downloadUrl?: string; // Generated download link

  @IsDateString()
  @IsOptional()
  public downloadExpiry?: Date;
}

/**
 * Processing objection request (Article 21)
 */
export class ProcessingObjectionRequest extends DataSubjectRightsRequest {
  @IsArray()
  @IsString({ each: true })
  public processingPurposes!: string[]; // Purposes being objected to

  @IsString()
  @IsOptional()
  public objectionReason?: string;

  @IsBoolean()
  @IsOptional()
  public objectToDirectMarketing?: boolean;

  @IsBoolean()
  @IsOptional()
  public objectToAutomatedDecisionMaking?: boolean;
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
  public restrictionGround!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public specificProcessingActivities?: string[];

  @IsDateString()
  @IsOptional()
  public restrictionEndDate?: Date;
}

/**
 * Create rights request DTO
 */
export class CreateRightsRequestDto {
  @IsString()
  @IsNotEmpty()
  public userId!: string;

  @IsEnum(DataSubjectRightType)
  public requestType!: DataSubjectRightType;

  @IsString()
  @IsOptional()
  public description?: string;

  @IsOptional()
  public requestDetails?: Record<string, unknown>; // Type-specific details

  @IsString()
  @IsOptional()
  public ipAddress?: string;

  @IsString()
  @IsOptional()
  public userAgent?: string;
}

/**
 * Identity verification for rights requests
 */
export class IdentityVerificationDto {
  @IsUUID()
  public requestId!: string;

  @IsEnum([
    'email_verification',
    'phone_verification',
    'document_upload',
    'security_questions',
  ])
  public verificationType!: string;

  @IsOptional()
  public verificationData?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  public verificationCode?: string;

  @IsDateString()
  @IsOptional()
  public verificationExpiry?: Date;
}

/**
 * Rights request processing update
 */
export class ProcessRightsRequestDto {
  @IsUUID()
  public requestId!: string;

  @IsEnum(RequestStatus)
  public status!: RequestStatus;

  @IsString()
  @IsOptional()
  public processorNotes?: string;

  @IsOptional()
  public completionData?: Record<string, unknown>; // Results of the request processing

  @IsString()
  @IsOptional()
  public rejectionReason?: string;
}

/**
 * Data export package structure
 */
export class DataExportPackage {
  @IsUUID()
  @IsOptional()
  public id?: string;

  @IsUUID()
  public requestId!: string;

  @IsString()
  @IsNotEmpty()
  public userId!: string;

  @IsEnum(DataExportFormat)
  public format!: DataExportFormat;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataCategoryExport)
  public dataCategories!: DataCategoryExport[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataCategoryExport)
  @IsOptional()
  public data?: DataCategoryExport[];

  @IsOptional()
  public metadata?: {
    exportDate: Date;
    dataController: string;
    privacyPolicyVersion: string;
    retentionPolicies: Record<string, string>;
    thirdPartyProcessors: string[];
  };

  @IsString()
  @IsOptional()
  public downloadUrl?: string;

  @IsDateString()
  @IsOptional()
  public urlExpiry?: Date;

  @IsNumber()
  @IsOptional()
  public fileSizeBytes?: number;

  public createdAt!: Date;
}

/**
 * Represents the data category export.
 */
export class DataCategoryExport {
  @IsString()
  @IsNotEmpty()
  public category!: string;

  @IsString()
  @IsNotEmpty()
  public description!: string;

  @IsOptional()
  public data!: unknown;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public sources?: string[]; // Which services/systems this data came from

  @IsString()
  @IsOptional()
  public legalBasis?: string;

  @IsString()
  @IsOptional()
  public retentionPeriod?: string;

  @IsDateString()
  @IsOptional()
  public collectionDate?: Date;

  @IsDateString()
  @IsOptional()
  public lastModified?: Date;
}

/**
 * Rights request status query
 */
export class RightsRequestStatusDto {
  @IsUUID()
  public requestId!: string;

  @IsEnum(DataSubjectRightType)
  public requestType!: DataSubjectRightType;

  @IsEnum(RequestStatus)
  public status!: RequestStatus;

  @IsEnum(IdentityVerificationStatus)
  public identityVerificationStatus!: IdentityVerificationStatus;

  @IsDateString()
  public requestDate!: Date;

  @IsDateString()
  @IsOptional()
  public dueDate?: Date;

  @IsDateString()
  @IsOptional()
  public completionDate?: Date;

  @IsString()
  @IsOptional()
  public statusMessage?: string;

  @IsOptional()
  public completionData?: Record<string, unknown>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestActivityLog)
  @IsOptional()
  public activityLog?: RequestActivityLog[];
}

/**
 * Represents the request activity log.
 */
export class RequestActivityLog {
  @IsDateString()
  public timestamp!: Date;

  @IsString()
  @IsNotEmpty()
  public action!: string;

  @IsString()
  @IsOptional()
  public performedBy?: string;

  @IsString()
  @IsOptional()
  public notes?: string;

  @IsEnum(RequestStatus)
  @IsOptional()
  public statusChange?: RequestStatus;
}

/**
 * Bulk rights processing for admin operations
 */
export class BulkRightsProcessingDto {
  @IsArray()
  @IsUUID(4, { each: true })
  public requestIds!: string[];

  @IsEnum(RequestStatus)
  public action!: RequestStatus;

  @IsString()
  @IsOptional()
  public notes?: string;

  @IsString()
  @IsOptional()
  public performedBy?: string;
}

/**
 * Rights fulfillment metrics
 */
export class RightsFulfillmentMetrics {
  @IsDateString()
  public periodStart!: Date;

  @IsDateString()
  public periodEnd!: Date;

  @IsOptional()
  public requestCounts?: {
    total: number;
    byType: Record<DataSubjectRightType, number>;
    byStatus: Record<RequestStatus, number>;
  };

  @IsOptional()
  public processingTimes?: {
    averageCompletionDays: number;
    medianCompletionDays: number;
    withinLegalDeadline: number;
    overdueCout: number;
  };

  @IsOptional()
  public identityVerification?: {
    verificationRate: number;
    averageVerificationTime: number;
    failureRate: number;
  };

  @IsOptional()
  public dataExports?: {
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
  public id!: string;

  @IsEnum(DataSubjectRightType)
  public requestType!: DataSubjectRightType;

  @IsString()
  @IsNotEmpty()
  public name!: string;

  @IsString()
  @IsOptional()
  public description?: string;

  @IsOptional()
  public conditions?: {
    userRole?: string[];
    dataCategories?: string[];
    requestReason?: string[];
    minimumAccountAge?: number;
  };

  @IsOptional()
  public actions?: {
    autoApprove?: boolean;
    requireVerification?: boolean;
    notifyAdministrator?: boolean;
    applyRestrictions?: boolean;
  };

  @IsBoolean()
  public isActive!: boolean;

  @IsDateString()
  public createdAt!: Date;

  @IsDateString()
  @IsOptional()
  public lastModified?: Date;
}
