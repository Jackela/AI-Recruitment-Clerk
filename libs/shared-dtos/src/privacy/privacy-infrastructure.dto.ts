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
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Privacy Infrastructure DTOs
 * Data Processing Records (Article 30), Breach Notifications, Retention Policies
 */

export enum ProcessingLegalBasis {
  CONSENT = 'consent', // Article 6(1)(a)
  CONTRACT = 'contract', // Article 6(1)(b)
  LEGAL_OBLIGATION = 'legal_obligation', // Article 6(1)(c)
  VITAL_INTERESTS = 'vital_interests', // Article 6(1)(d)
  PUBLIC_TASK = 'public_task', // Article 6(1)(e)
  LEGITIMATE_INTERESTS = 'legitimate_interests', // Article 6(1)(f)
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
  CONFIDENTIALITY = 'confidentiality', // Unauthorized access
  INTEGRITY = 'integrity', // Unauthorized alteration
  AVAILABILITY = 'availability', // Loss of access/destruction
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
 * Data Processing Record (Article 30 GDPR)
 * Mandatory records of processing activities
 */
export class DataProcessingRecord {
  @IsUUID()
  public id!: string;

  @IsString()
  @IsNotEmpty()
  public name!: string;

  @IsString()
  @IsNotEmpty()
  public description!: string;

  @IsString()
  @IsNotEmpty()
  public dataController!: string; // Organization name

  @IsString()
  @IsNotEmpty()
  public dataProcessorService!: string; // Which microservice

  @IsArray()
  @IsString({ each: true })
  public purposesOfProcessing!: string[];

  @IsArray()
  @IsString({ each: true })
  public categoriesOfDataSubjects!: string[]; // e.g., "job applicants", "employees", "users"

  @IsArray()
  @IsString({ each: true })
  public categoriesOfPersonalData!: string[]; // e.g., "contact details", "employment history"

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public categoriesOfRecipients?: string[]; // Who receives the data

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThirdPartyTransfer)
  @IsOptional()
  public thirdPartyTransfers?: ThirdPartyTransfer[];

  @IsString()
  @IsOptional()
  public retentionPeriod?: string; // e.g., "2 years", "until consent withdrawal"

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SecurityMeasure)
  @IsOptional()
  public technicalSafeguards?: SecurityMeasure[];

  @IsEnum(ProcessingLegalBasis)
  public legalBasis!: ProcessingLegalBasis;

  @IsString()
  @IsOptional()
  public legitimateInterestsAssessment?: string; // For Article 6(1)(f)

  @IsBoolean()
  @IsOptional()
  public involvesSpecialCategories?: boolean; // Article 9 data

  @IsString()
  @IsOptional()
  public specialCategoriesLegalBasis?: string;

  @IsBoolean()
  @IsOptional()
  public involvesAutomatedDecisionMaking?: boolean;

  @IsString()
  @IsOptional()
  public automatedDecisionMakingLogic?: string;

  @IsDateString()
  @IsOptional()
  public lastReview?: Date;

  @IsString()
  @IsOptional()
  public reviewedBy?: string;

  public createdAt!: Date;
  public updatedAt!: Date;
}

/**
 * Represents the third party transfer.
 */
export class ThirdPartyTransfer {
  @IsString()
  @IsNotEmpty()
  public recipient!: string;

  @IsString()
  @IsNotEmpty()
  public country!: string;

  @IsString()
  @IsOptional()
  public adequacyDecision?: string; // EU Commission adequacy decision

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public safeguards?: string[]; // SCCs, BCRs, etc.

  @IsString()
  @IsOptional()
  public purpose?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public dataCategories?: string[];
}

/**
 * Represents the security measure.
 */
export class SecurityMeasure {
  @IsString()
  @IsNotEmpty()
  public measure!: string;

  @IsString()
  @IsOptional()
  public description?: string;

  @IsString()
  @IsOptional()
  public implementation?: string;

  @IsDateString()
  @IsOptional()
  public lastAssessed?: Date;
}

/**
 * Data Retention Policy
 */
export class DataRetentionPolicy {
  @IsUUID()
  public id!: string;

  @IsString()
  @IsNotEmpty()
  public name!: string;

  @IsString()
  @IsNotEmpty()
  public dataCategory!: string;

  @IsString()
  @IsOptional()
  public description?: string;

  @IsNumber()
  public retentionPeriodDays!: number;

  @IsString()
  @IsOptional()
  public retentionBasis?: string; // Legal requirement, business need, etc.

  @IsEnum(DataRetentionStatus)
  @IsOptional()
  public defaultAction?: DataRetentionStatus; // What happens when retention expires

  @IsBoolean()
  public allowUserDeletion!: boolean;

  @IsBoolean()
  public hasLegalHoldExemption!: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public applicableServices?: string[]; // Which microservices this applies to

  @IsOptional()
  public automationRules?: {
    enableAutoDeletion: boolean;
    notificationDaysBefore: number;
    requireApproval: boolean;
    approvers: string[];
  };

  @IsBoolean()
  public isActive!: boolean;

  public createdAt!: Date;
  public updatedAt!: Date;
}

/**
 * Data retention tracking for individual records
 */
export class DataRetentionRecord {
  @IsUUID()
  public id!: string;

  @IsString()
  @IsNotEmpty()
  public dataIdentifier!: string; // User ID, document ID, etc.

  @IsString()
  @IsNotEmpty()
  public dataCategory!: string;

  @IsUUID()
  public retentionPolicyId!: string;

  @IsDateString()
  public dataCreated!: Date;

  @IsDateString()
  public retentionExpiry!: Date;

  @IsEnum(DataRetentionStatus)
  public status!: DataRetentionStatus;

  @IsDateString()
  @IsOptional()
  public deletionScheduled?: Date;

  @IsDateString()
  @IsOptional()
  public deletionCompleted?: Date;

  @IsString()
  @IsOptional()
  public legalHoldReason?: string;

  @IsString()
  @IsOptional()
  public notes?: string;

  public createdAt!: Date;
  public updatedAt!: Date;
}

/**
 * Privacy Impact Assessment (DPIA)
 */
export class PrivacyImpactAssessment {
  @IsUUID()
  public id!: string;

  @IsString()
  @IsNotEmpty()
  public name!: string;

  @IsString()
  @IsNotEmpty()
  public description!: string;

  @IsString()
  @IsNotEmpty()
  public projectOwner!: string;

  @IsString()
  @IsNotEmpty()
  public dataController!: string;

  @IsArray()
  @IsString({ each: true })
  public processingPurposes!: string[];

  @IsArray()
  @IsString({ each: true })
  public dataCategories!: string[];

  @IsArray()
  @IsString({ each: true })
  public dataSubjects!: string[];

  @IsOptional()
  public riskAssessment?: {
    identifiedRisks: RiskAssessment[];
    residualRiskLevel: 'low' | 'medium' | 'high' | 'very_high';
    mitigationMeasures: string[];
    acceptableRiskLevel: boolean;
  };

  @IsOptional()
  public stakeholderConsultation?: {
    dpoConducted: boolean;
    dataSubjectsConsulted: boolean;
    externalConsultantsUsed: boolean;
    consultationSummary: string;
  };

  @IsEnum([
    'draft',
    'under_review',
    'approved',
    'rejected',
    'requires_revision',
  ])
  public status!: string;

  @IsString()
  @IsOptional()
  public reviewedBy?: string;

  @IsDateString()
  @IsOptional()
  public approvalDate?: Date;

  @IsDateString()
  @IsOptional()
  public nextReviewDate?: Date;

  public createdAt!: Date;
  public updatedAt!: Date;
}

/**
 * Represents the risk assessment.
 */
export class RiskAssessment {
  @IsString()
  @IsNotEmpty()
  public riskDescription!: string;

  @IsEnum(['low', 'medium', 'high', 'very_high'])
  public likelihood!: string;

  @IsEnum(['low', 'medium', 'high', 'very_high'])
  public impact!: string;

  @IsEnum(['low', 'medium', 'high', 'very_high'])
  public overallRisk!: string;

  @IsArray()
  @IsString({ each: true })
  public mitigations!: string[];

  @IsEnum(['low', 'medium', 'high', 'very_high'])
  public residualRisk!: string;
}

/**
 * Data Breach Management
 */
export class DataBreachRecord {
  @IsUUID()
  public id!: string;

  @IsString()
  @IsNotEmpty()
  public title!: string;

  @IsString()
  @IsNotEmpty()
  public description!: string;

  @IsEnum(BreachType)
  public breachType!: BreachType;

  @IsEnum(BreachSeverity)
  public severity!: BreachSeverity;

  @IsEnum(BreachStatus)
  public status!: BreachStatus;

  @IsDateString()
  public discoveryDate!: Date;

  @IsDateString()
  @IsOptional()
  public estimatedOccurrenceDate?: Date;

  @IsDateString()
  @IsOptional()
  public containmentDate?: Date;

  @IsNumber()
  @IsOptional()
  public affectedRecordsCount?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public affectedDataCategories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public affectedDataSubjects?: string[];

  @IsOptional()
  public rootCause?: {
    category:
      | 'human_error'
      | 'system_failure'
      | 'malicious_attack'
      | 'third_party'
      | 'other';
    description: string;
    contributingFactors: string[];
  };

  @IsOptional()
  public riskAssessment?: {
    likelihoodOfHarm: 'low' | 'medium' | 'high';
    potentialConsequences: string[];
    requiresNotification: boolean;
    requiresDataSubjectNotification: boolean;
    reasoning: string;
  };

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreachNotification)
  @IsOptional()
  public notifications?: BreachNotification[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public immediateMitigation?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public longTermPreventionMeasures?: string[];

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
 * Represents the breach notification.
 */
export class BreachNotification {
  @IsEnum(['supervisory_authority', 'data_subjects', 'internal', 'third_party'])
  public type!: string;

  @IsDateString()
  public sentDate!: Date;

  @IsString()
  @IsOptional()
  public recipient?: string;

  @IsString()
  @IsOptional()
  public method?: string; // email, phone, postal, website notice, etc.

  @IsString()
  @IsOptional()
  public confirmationReference?: string;

  @IsString()
  @IsOptional()
  public responseReceived?: string;
}

/**
 * Cross-border data transfer documentation
 */
export class CrossBorderTransfer {
  @IsUUID()
  public id!: string;

  @IsString()
  @IsNotEmpty()
  public transferName!: string;

  @IsString()
  @IsNotEmpty()
  public dataExporter!: string; // EU entity

  @IsString()
  @IsNotEmpty()
  public dataImporter!: string; // Non-EU entity

  @IsString()
  @IsNotEmpty()
  public destinationCountry!: string;

  @IsArray()
  @IsString({ each: true })
  public dataCategories!: string[];

  @IsArray()
  @IsString({ each: true })
  public purposesOfTransfer!: string[];

  @IsEnum([
    'adequacy_decision',
    'standard_contractual_clauses',
    'binding_corporate_rules',
    'consent',
    'contract_necessity',
    'derogation',
  ])
  public legalMechanism!: string;

  @IsString()
  @IsOptional()
  public adequacyDecisionReference?: string;

  @IsUrl()
  @IsOptional()
  public sccDocumentUrl?: string;

  @IsDateString()
  @IsOptional()
  public agreementDate?: Date;

  @IsDateString()
  @IsOptional()
  public reviewDate?: Date;

  @IsOptional()
  public riskAssessment?: {
    countryRiskLevel: 'low' | 'medium' | 'high';
    additionalSafeguards: string[];
    monitoringMeasures: string[];
    lastAssessment: Date;
  };

  @IsBoolean()
  public isActive!: boolean;

  public createdAt!: Date;
  public updatedAt!: Date;
}

/**
 * Privacy compliance monitoring
 */
export class PrivacyComplianceCheck {
  @IsUUID()
  public id!: string;

  @IsString()
  @IsNotEmpty()
  public checkType!: string; // 'consent_validation', 'retention_compliance', 'transfer_monitoring', etc.

  @IsString()
  @IsNotEmpty()
  public systemComponent!: string; // Which service/component was checked

  @IsEnum(['passed', 'failed', 'warning', 'not_applicable'])
  public result!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public findings?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public recommendations?: string[];

  @IsDateString()
  public checkDate!: Date;

  @IsString()
  @IsOptional()
  public performedBy?: string;

  @IsDateString()
  @IsOptional()
  public nextCheckDate?: Date;

  @IsOptional()
  public metadata?: Record<string, unknown>;

  public createdAt!: Date;
}

/**
 * Create/Update DTOs
 */
export class CreateDataProcessingRecordDto {
  @IsString()
  @IsNotEmpty()
  public name!: string;

  @IsString()
  @IsNotEmpty()
  public description!: string;

  @IsString()
  @IsNotEmpty()
  public dataProcessorService!: string;

  @IsArray()
  @IsString({ each: true })
  public purposesOfProcessing!: string[];

  @IsArray()
  @IsString({ each: true })
  public categoriesOfPersonalData!: string[];

  @IsEnum(ProcessingLegalBasis)
  public legalBasis!: ProcessingLegalBasis;

  // ... other fields as optional for creation
}

/**
 * Describes the create breach record data transfer object.
 */
export class CreateBreachRecordDto {
  @IsString()
  @IsNotEmpty()
  public title!: string;

  @IsString()
  @IsNotEmpty()
  public description!: string;

  @IsEnum(BreachType)
  public breachType!: BreachType;

  @IsEnum(BreachSeverity)
  public severity!: BreachSeverity;

  @IsDateString()
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
  @IsUUID()
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
