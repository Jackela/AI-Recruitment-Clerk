import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, IsArray, ValidateNested, IsDateString, IsUUID, IsNumber, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Privacy Infrastructure DTOs
 * Data Processing Records (Article 30), Breach Notifications, Retention Policies
 */

export enum ProcessingLegalBasis {
  CONSENT = 'consent',                           // Article 6(1)(a)
  CONTRACT = 'contract',                         // Article 6(1)(b) 
  LEGAL_OBLIGATION = 'legal_obligation',         // Article 6(1)(c)
  VITAL_INTERESTS = 'vital_interests',           // Article 6(1)(d)
  PUBLIC_TASK = 'public_task',                   // Article 6(1)(e)
  LEGITIMATE_INTERESTS = 'legitimate_interests'  // Article 6(1)(f)
}

export enum DataRetentionStatus {
  ACTIVE = 'active',
  PENDING_DELETION = 'pending_deletion',
  ANONYMIZED = 'anonymized',
  DELETED = 'deleted',
  ARCHIVED = 'archived',
  LEGAL_HOLD = 'legal_hold'
}

export enum BreachSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum BreachType {
  CONFIDENTIALITY = 'confidentiality',  // Unauthorized access
  INTEGRITY = 'integrity',              // Unauthorized alteration
  AVAILABILITY = 'availability'         // Loss of access/destruction
}

export enum BreachStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  NOTIFIED_AUTHORITY = 'notified_authority',
  NOTIFIED_SUBJECTS = 'notified_subjects',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

/**
 * Data Processing Record (Article 30 GDPR)
 * Mandatory records of processing activities
 */
export class DataProcessingRecord {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  dataController: string; // Organization name

  @IsString()
  @IsNotEmpty()
  dataProcessorService!: string; // Which microservice

  @IsArray()
  @IsString({ each: true })
  purposesOfProcessing!: string[];

  @IsArray()
  @IsString({ each: true })
  categoriesOfDataSubjects: string[]; // e.g., "job applicants", "employees", "users"

  @IsArray()
  @IsString({ each: true })
  categoriesOfPersonalData!: string[]; // e.g., "contact details", "employment history"

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoriesOfRecipients?: string[]; // Who receives the data

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThirdPartyTransfer)
  @IsOptional()
  thirdPartyTransfers?: ThirdPartyTransfer[];

  @IsString()
  @IsOptional()
  retentionPeriod?: string; // e.g., "2 years", "until consent withdrawal"

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SecurityMeasure)
  @IsOptional()
  technicalSafeguards?: SecurityMeasure[];

  @IsEnum(ProcessingLegalBasis)
  legalBasis!: ProcessingLegalBasis;

  @IsString()
  @IsOptional()
  legitimateInterestsAssessment?: string; // For Article 6(1)(f)

  @IsBoolean()
  @IsOptional()
  involvesSpecialCategories?: boolean; // Article 9 data

  @IsString()
  @IsOptional()
  specialCategoriesLegalBasis?: string;

  @IsBoolean()
  @IsOptional()
  involvesAutomatedDecisionMaking?: boolean;

  @IsString()
  @IsOptional()
  automatedDecisionMakingLogic?: string;

  @IsDateString()
  @IsOptional()
  lastReview?: Date;

  @IsString()
  @IsOptional()
  reviewedBy?: string;

  createdAt!: Date;
  updatedAt: Date;
}

export class ThirdPartyTransfer {
  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsOptional()
  adequacyDecision?: string; // EU Commission adequacy decision

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  safeguards?: string[]; // SCCs, BCRs, etc.

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dataCategories?: string[];
}

export class SecurityMeasure {
  @IsString()
  @IsNotEmpty()
  measure: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  implementation?: string;

  @IsDateString()
  @IsOptional()
  lastAssessed?: Date;
}

/**
 * Data Retention Policy
 */
export class DataRetentionPolicy {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  dataCategory: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  retentionPeriodDays: number;

  @IsString()
  @IsOptional()
  retentionBasis?: string; // Legal requirement, business need, etc.

  @IsEnum(DataRetentionStatus)
  @IsOptional()
  defaultAction?: DataRetentionStatus; // What happens when retention expires

  @IsBoolean()
  allowUserDeletion: boolean;

  @IsBoolean()
  hasLegalHoldExemption: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicableServices?: string[]; // Which microservices this applies to

  @IsOptional()
  automationRules?: {
    enableAutoDeletion: boolean;
    notificationDaysBefore: number;
    requireApproval: boolean;
    approvers: string[];
  };

  @IsBoolean()
  isActive: boolean;

  createdAt!: Date;
  updatedAt: Date;
}

/**
 * Data retention tracking for individual records
 */
export class DataRetentionRecord {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  dataIdentifier: string; // User ID, document ID, etc.

  @IsString()
  @IsNotEmpty()
  dataCategory: string;

  @IsUUID()
  retentionPolicyId: string;

  @IsDateString()
  dataCreated: Date;

  @IsDateString()
  retentionExpiry: Date;

  @IsEnum(DataRetentionStatus)
  status: DataRetentionStatus;

  @IsDateString()
  @IsOptional()
  deletionScheduled?: Date;

  @IsDateString()
  @IsOptional()
  deletionCompleted?: Date;

  @IsString()
  @IsOptional()
  legalHoldReason?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  createdAt!: Date;
  updatedAt: Date;
}

/**
 * Privacy Impact Assessment (DPIA)
 */
export class PrivacyImpactAssessment {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  projectOwner: string;

  @IsString()
  @IsNotEmpty()
  dataController: string;

  @IsArray()
  @IsString({ each: true })
  processingPurposes: string[];

  @IsArray()
  @IsString({ each: true })
  dataCategories: string[];

  @IsArray()
  @IsString({ each: true })
  dataSubjects: string[];

  @IsOptional()
  riskAssessment?: {
    identifiedRisks: RiskAssessment[];
    residualRiskLevel: 'low' | 'medium' | 'high' | 'very_high';
    mitigationMeasures: string[];
    acceptableRiskLevel: boolean;
  };

  @IsOptional()
  stakeholderConsultation?: {
    dpoConducted: boolean;
    dataSubjectsConsulted: boolean;
    externalConsultantsUsed: boolean;
    consultationSummary: string;
  };

  @IsEnum(['draft', 'under_review', 'approved', 'rejected', 'requires_revision'])
  status: string;

  @IsString()
  @IsOptional()
  reviewedBy?: string;

  @IsDateString()
  @IsOptional()
  approvalDate?: Date;

  @IsDateString()
  @IsOptional()
  nextReviewDate?: Date;

  createdAt!: Date;
  updatedAt: Date;
}

export class RiskAssessment {
  @IsString()
  @IsNotEmpty()
  riskDescription: string;

  @IsEnum(['low', 'medium', 'high', 'very_high'])
  likelihood: string;

  @IsEnum(['low', 'medium', 'high', 'very_high'])
  impact: string;

  @IsEnum(['low', 'medium', 'high', 'very_high'])
  overallRisk: string;

  @IsArray()
  @IsString({ each: true })
  mitigations: string[];

  @IsEnum(['low', 'medium', 'high', 'very_high'])
  residualRisk: string;
}

/**
 * Data Breach Management
 */
export class DataBreachRecord {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(BreachType)
  breachType: BreachType;

  @IsEnum(BreachSeverity)
  severity: BreachSeverity;

  @IsEnum(BreachStatus)
  status: BreachStatus;

  @IsDateString()
  discoveryDate: Date;

  @IsDateString()
  @IsOptional()
  estimatedOccurrenceDate?: Date;

  @IsDateString()
  @IsOptional()
  containmentDate?: Date;

  @IsNumber()
  @IsOptional()
  affectedRecordsCount?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  affectedDataCategories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  affectedDataSubjects?: string[];

  @IsOptional()
  rootCause?: {
    category: 'human_error' | 'system_failure' | 'malicious_attack' | 'third_party' | 'other';
    description!: string;
    contributingFactors: string[];
  };

  @IsOptional()
  riskAssessment?: {
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
  notifications?: BreachNotification[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  immediateMitigation?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  longTermPreventionMeasures?: string[];

  @IsString()
  @IsOptional()
  reportedBy?: string;

  @IsString()
  @IsOptional()
  investigatedBy?: string;

  createdAt!: Date;
  updatedAt: Date;
}

export class BreachNotification {
  @IsEnum(['supervisory_authority', 'data_subjects', 'internal', 'third_party'])
  type: string;

  @IsDateString()
  sentDate: Date;

  @IsString()
  @IsOptional()
  recipient?: string;

  @IsString()
  @IsOptional()
  method?: string; // email, phone, postal, website notice, etc.

  @IsString()
  @IsOptional()
  confirmationReference?: string;

  @IsString()
  @IsOptional()
  responseReceived?: string;
}

/**
 * Cross-border data transfer documentation
 */
export class CrossBorderTransfer {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  transferName: string;

  @IsString()
  @IsNotEmpty()
  dataExporter: string; // EU entity

  @IsString()
  @IsNotEmpty()
  dataImporter: string; // Non-EU entity

  @IsString()
  @IsNotEmpty()
  destinationCountry: string;

  @IsArray()
  @IsString({ each: true })
  dataCategories: string[];

  @IsArray()
  @IsString({ each: true })
  purposesOfTransfer: string[];

  @IsEnum(['adequacy_decision', 'standard_contractual_clauses', 'binding_corporate_rules', 'consent', 'contract_necessity', 'derogation'])
  legalMechanism: string;

  @IsString()
  @IsOptional()
  adequacyDecisionReference?: string;

  @IsUrl()
  @IsOptional()
  sccDocumentUrl?: string;

  @IsDateString()
  @IsOptional()
  agreementDate?: Date;

  @IsDateString()
  @IsOptional()
  reviewDate?: Date;

  @IsOptional()
  riskAssessment?: {
    countryRiskLevel: 'low' | 'medium' | 'high';
    additionalSafeguards: string[];
    monitoringMeasures: string[];
    lastAssessment: Date;
  };

  @IsBoolean()
  isActive: boolean;

  createdAt!: Date;
  updatedAt: Date;
}

/**
 * Privacy compliance monitoring
 */
export class PrivacyComplianceCheck {
  @IsUUID()
  id: string;

  @IsString()
  @IsNotEmpty()
  checkType!: string; // 'consent_validation', 'retention_compliance', 'transfer_monitoring', etc.

  @IsString()
  @IsNotEmpty()
  systemComponent!: string; // Which service/component was checked

  @IsEnum(['passed', 'failed', 'warning', 'not_applicable'])
  result!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  findings?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  recommendations?: string[];

  @IsDateString()
  checkDate!: Date;

  @IsString()
  @IsOptional()
  performedBy?: string;

  @IsDateString()
  @IsOptional()
  nextCheckDate?: Date;

  @IsOptional()
  metadata?: Record<string, any>;

  createdAt!: Date;
}

/**
 * Create/Update DTOs
 */
export class CreateDataProcessingRecordDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  dataProcessorService!: string;

  @IsArray()
  @IsString({ each: true })
  purposesOfProcessing!: string[];

  @IsArray()
  @IsString({ each: true })
  categoriesOfPersonalData!: string[];

  @IsEnum(ProcessingLegalBasis)
  legalBasis!: ProcessingLegalBasis;

  // ... other fields as optional for creation
}

export class CreateBreachRecordDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(BreachType)
  breachType!: BreachType;

  @IsEnum(BreachSeverity)
  severity!: BreachSeverity;

  @IsDateString()
  @IsOptional()
  discoveryDate?: Date;

  @IsString()
  @IsOptional()
  reportedBy?: string;
}

export class UpdateRetentionStatusDto {
  @IsUUID()
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