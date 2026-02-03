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
  public id!: string;

  @IsString()
  public name!: string;

  @IsString()
  public description!: string;

  @IsString()
  public dataController!: string;

  @IsString()
  public dataProcessorService!: string;

  @IsArray()
  @IsString({ each: true })
  public purposesOfProcessing!: string[];

  @IsArray()
  @IsString({ each: true })
  public categoriesOfDataSubjects!: string[];

  @IsArray()
  @IsString({ each: true })
  public categoriesOfPersonalData!: string[];

  @IsEnum(ProcessingLegalBasis)
  public legalBasis!: ProcessingLegalBasis;

  @IsString()
  @IsOptional()
  public retentionPeriod?: string;

  @IsBoolean()
  @IsOptional()
  public involvesSpecialCategories?: boolean;

  public createdAt!: Date;
  public updatedAt!: Date;
}

/**
 * 数据保留政策
 */
export class DataRetentionPolicy {
  @IsString()
  public id!: string;

  @IsString()
  public name!: string;

  @IsString()
  public dataCategory!: string;

  @IsNumber()
  public retentionPeriodDays!: number;

  @IsEnum(DataRetentionStatus)
  @IsOptional()
  public defaultAction?: DataRetentionStatus;

  @IsBoolean()
  public allowUserDeletion!: boolean;

  @IsBoolean()
  public hasLegalHoldExemption!: boolean;

  @IsBoolean()
  public isActive!: boolean;

  public createdAt!: Date;
  public updatedAt!: Date;
}

/**
 * 数据泄露记录
 */
export class DataBreachRecord {
  @IsString()
  public id!: string;

  @IsString()
  public title!: string;

  @IsString()
  public description!: string;

  @IsEnum(BreachType)
  public breachType!: BreachType;

  @IsEnum(BreachSeverity)
  public severity!: BreachSeverity;

  @IsEnum(BreachStatus)
  public status!: BreachStatus;

  public discoveryDate!: Date;

  @IsOptional()
  public estimatedOccurrenceDate?: Date;

  @IsOptional()
  public containmentDate?: Date;

  @IsNumber()
  @IsOptional()
  public affectedRecordsCount?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public affectedDataCategories?: string[];

  @IsString()
  @IsOptional()
  public reportedBy?: string;

  @IsString()
  @IsOptional()
  public investigatedBy?: string;

  public createdAt!: Date;
  public updatedAt!: Date;
}

/**
 * 创建/更新 DTOs
 */
export class CreateDataProcessingRecordDto {
  @IsString()
  public name!: string;

  @IsString()
  public description!: string;

  @IsString()
  public dataProcessorService!: string;

  @IsArray()
  @IsString({ each: true })
  public purposesOfProcessing!: string[];

  @IsArray()
  @IsString({ each: true })
  public categoriesOfPersonalData!: string[];

  @IsEnum(ProcessingLegalBasis)
  public legalBasis!: ProcessingLegalBasis;
}

/**
 * Describes the create breach record data transfer object.
 */
export class CreateBreachRecordDto {
  @IsString()
  public title!: string;

  @IsString()
  public description!: string;

  @IsEnum(BreachType)
  public breachType!: BreachType;

  @IsEnum(BreachSeverity)
  public severity!: BreachSeverity;

  @IsOptional()
  public discoveryDate?: Date;

  @IsString()
  @IsOptional()
  public reportedBy?: string;
}

/**
 * Describes the update retention status data transfer object.
 */
export class UpdateRetentionStatusDto {
  @IsString()
  public recordId!: string;

  @IsEnum(DataRetentionStatus)
  public status!: DataRetentionStatus;

  @IsString()
  @IsOptional()
  public notes?: string;

  @IsString()
  @IsOptional()
  public performedBy?: string;
}
