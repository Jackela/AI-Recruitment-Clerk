import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
} from 'class-validator';

/**
 * 简化的隐私基础设施DTO
 * 专为Railway部署优化
 */

export enum ProcessingLegalBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests',
}

export enum DataRetentionStatus {
  ACTIVE = 'active',
  PENDING_DELETION = 'pending_deletion',
  ANONYMIZED = 'anonymized',
  DELETED = 'deleted',
  ARCHIVED = 'archived',
  LEGAL_HOLD = 'legal_hold',
}

export enum BreachSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum BreachType {
  CONFIDENTIALITY = 'confidentiality',
  INTEGRITY = 'integrity',
  AVAILABILITY = 'availability',
}

export enum BreachStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  NOTIFIED_AUTHORITY = 'notified_authority',
  NOTIFIED_SUBJECTS = 'notified_subjects',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

/**
 * 数据处理记录 (简化版)
 */
export class DataProcessingRecord {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsString()
  dataController!: string;

  @IsString()
  dataProcessorService!: string;

  @IsArray()
  @IsString({ each: true })
  purposesOfProcessing!: string[];

  @IsArray()
  @IsString({ each: true })
  categoriesOfDataSubjects!: string[];

  @IsArray()
  @IsString({ each: true })
  categoriesOfPersonalData!: string[];

  @IsEnum(ProcessingLegalBasis)
  legalBasis!: ProcessingLegalBasis;

  @IsString()
  @IsOptional()
  retentionPeriod?: string;

  @IsBoolean()
  @IsOptional()
  involvesSpecialCategories?: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * 数据保留政策
 */
export class DataRetentionPolicy {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  dataCategory!: string;

  @IsNumber()
  retentionPeriodDays!: number;

  @IsEnum(DataRetentionStatus)
  @IsOptional()
  defaultAction?: DataRetentionStatus;

  @IsBoolean()
  allowUserDeletion!: boolean;

  @IsBoolean()
  hasLegalHoldExemption!: boolean;

  @IsBoolean()
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * 数据泄露记录
 */
export class DataBreachRecord {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(BreachType)
  breachType!: BreachType;

  @IsEnum(BreachSeverity)
  severity!: BreachSeverity;

  @IsEnum(BreachStatus)
  status!: BreachStatus;

  discoveryDate!: Date;

  @IsOptional()
  estimatedOccurrenceDate?: Date;

  @IsOptional()
  containmentDate?: Date;

  @IsNumber()
  @IsOptional()
  affectedRecordsCount?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  affectedDataCategories?: string[];

  @IsString()
  @IsOptional()
  reportedBy?: string;

  @IsString()
  @IsOptional()
  investigatedBy?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * 创建/更新 DTOs
 */
export class CreateDataProcessingRecordDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsString()
  dataProcessorService!: string;

  @IsArray()
  @IsString({ each: true })
  purposesOfProcessing!: string[];

  @IsArray()
  @IsString({ each: true })
  categoriesOfPersonalData!: string[];

  @IsEnum(ProcessingLegalBasis)
  legalBasis!: ProcessingLegalBasis;
}

/**
 * Describes the create breach record data transfer object.
 */
export class CreateBreachRecordDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(BreachType)
  breachType!: BreachType;

  @IsEnum(BreachSeverity)
  severity!: BreachSeverity;

  @IsOptional()
  discoveryDate?: Date;

  @IsString()
  @IsOptional()
  reportedBy?: string;
}

/**
 * Describes the update retention status data transfer object.
 */
export class UpdateRetentionStatusDto {
  @IsString()
  recordId!: string;

  @IsEnum(DataRetentionStatus)
  status!: DataRetentionStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  performedBy?: string;
}
