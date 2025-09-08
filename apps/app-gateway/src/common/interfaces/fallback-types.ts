// Fallback types for when shared DTOs are not available

export enum Permission {
  CREATE_JOB = 'create_job',
  READ_JOB = 'read_job',
  UPDATE_JOB = 'update_job',
  DELETE_JOB = 'delete_job',
  UPLOAD_RESUME = 'upload_resume',
  READ_RESUME = 'read_resume',
  DELETE_RESUME = 'delete_resume',
  READ_ANALYSIS = 'read_analysis',
  GENERATE_REPORT = 'generate_report',
  CREATE_USER = 'create_user',
  READ_USER = 'read_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  MANAGE_USER = 'manage_user',
  READ_ORGANIZATION = 'read_organization',
  UPDATE_ORGANIZATION = 'update_organization',
  SYSTEM_CONFIG = 'system_config',
  VIEW_LOGS = 'view_logs',
  MANAGE_INTEGRATIONS = 'manage_integrations',
  TRACK_METRICS = 'track_metrics',
  VIEW_ANALYTICS = 'view_analytics',
  VALIDATE_INCENTIVE = 'validate_incentive',
  APPROVE_INCENTIVE = 'approve_incentive',
  REJECT_INCENTIVE = 'reject_incentive',
  PROCESS_PAYMENT = 'process_payment',
  BATCH_PROCESS_INCENTIVE = 'batch_process_incentive',
  READ_INCENTIVE_STATS = 'read_incentive_stats',
  EXPORT_INCENTIVE_DATA = 'export_incentive_data',
  MANAGE_INCENTIVE_RULES = 'manage_incentive_rules',
  CREATE_QUESTIONNAIRE = 'create_questionnaire',
  UPDATE_QUESTIONNAIRE = 'update_questionnaire',
  PUBLISH_QUESTIONNAIRE = 'publish_questionnaire',
  DELETE_QUESTIONNAIRE = 'delete_questionnaire',
  READ_QUESTIONNAIRE_RESPONSES = 'read_questionnaire_responses',
  READ_QUESTIONNAIRE_ANALYTICS = 'read_questionnaire_analytics',
  EXPORT_QUESTIONNAIRE_DATA = 'export_questionnaire_data',
  CREATE_QUESTIONNAIRE_TEMPLATE = 'create_questionnaire_template',
  READ_QUESTIONNAIRE_TEMPLATE = 'read_questionnaire_template',
  PROCESS_RESUME = 'process_resume',
  SEARCH_RESUME = 'search_resume',
  READ_ANALYTICS = 'read_analytics',
  ADMIN = 'admin',
  MANAGE_QUOTAS = 'manage_quotas',
  READ_USAGE_LIMITS = 'read_usage_limits',
  READ_USAGE_DETAILS = 'read_usage_details',
  MANAGE_USAGE_POLICY = 'manage_usage_policy',
}

export class UserDto {
  id = '';
  email = '';
  firstName?: string;
  lastName?: string;
  role = '';
  status = '';
  organizationId?: string;
  permissions: Permission[] = [];
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
}

// User Profile Schema types
export interface UserPreferences {
  language?: string;
  timezone?: string;
  notifications?: {
    email?: boolean;
    browser?: boolean;
    mobile?: boolean;
    push?: boolean;
    sms?: boolean;
  };
}

export enum IncentiveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
}

export enum RewardType {
  MONETARY = 'monetary',
  POINTS = 'points',
  DISCOUNT = 'discount',
}

export enum TriggerType {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
}

export enum PaymentMethod {
  WECHAT_PAY = 'wechat_pay',
  ALIPAY = 'alipay',
  BANK_TRANSFER = 'bank_transfer',
}

export enum Currency {
  CNY = 'CNY',
  USD = 'USD',
}

export class ContactInfo {
  email?: string;
  phone?: string;
  wechat?: string;
  alipay?: string;

  constructor(data: any = {}) {
    this.email = data.email;
    this.phone = data.phone;
    this.wechat = data.wechat;
    this.alipay = data.alipay;
  }
}

// Placeholder types for missing DTOs
export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  status: string;
  consentDate: Date;
  dataCategories: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserConsentProfile {
  userId: string;
  consentRecords: ConsentRecord[];
  lastConsentUpdate: Date;
  consentVersion?: string;
  createdAt: Date;
  updatedAt: Date;
  hasValidConsent: (purpose: any) => boolean;
  getGrantedPurposes: () => string[];
  needsConsentRenewal: () => boolean;
}

export class UserConsentProfileDto {
  userId: string = '';
  consentRecords: ConsentRecord[] = [];
  lastConsentUpdate: Date = new Date();
  consentVersion?: string;
  createdAt: Date = new Date();
  updatedAt: Date = new Date();

  constructor(data: Partial<UserConsentProfile> = {}) {
    Object.assign(this, data);
  }

  hasValidConsent(purpose: any): boolean {
    // Implementation would check consent records
    return this.consentRecords.some(
      (record) => record.purpose === purpose && record.status === 'granted',
    );
  }

  getGrantedPurposes(): string[] {
    return this.consentRecords
      .filter((record) => record.status === 'granted')
      .map((record) => record.purpose);
  }

  needsConsentRenewal(): boolean {
    // Implementation would check if consent needs renewal
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    return this.lastConsentUpdate < oneYearAgo;
  }
}

export interface CaptureConsentDto {
  userId: string;
  consents: any[];
  ipAddress?: string;
  userAgent?: string;
  consentVersion?: string;
}

export class CaptureConsentRequestDto {
  userId: string = '';
  consents: any[] = [];
  ipAddress?: string;
  userAgent?: string;
  consentVersion?: string;

  constructor(data: Partial<CaptureConsentDto> = {}) {
    Object.assign(this, data);
  }
}

export interface WithdrawConsentDto {
  userId: string;
  purpose: string;
  reason?: string;
}

export class WithdrawConsentRequestDto {
  userId: string = '';
  purpose: string = '';
  reason?: string;

  constructor(data: Partial<WithdrawConsentDto> = {}) {
    Object.assign(this, data);
  }
}

export interface ConsentStatusDto {
  userId: string;
  purposes: any[];
  needsRenewal: boolean;
  lastUpdated: Date;
}

export class ConsentStatusResponseDto {
  userId: string = '';
  purposes: any[] = [];
  needsRenewal: boolean = false;
  lastUpdated: Date = new Date();

  constructor(data: Partial<ConsentStatusDto> = {}) {
    Object.assign(this, data);
  }
}

export interface CreateRightsRequestDto {
  userId: string;
  requestType: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  requestDetails?: any;
}

export class CreateRightsRequestBodyDto {
  userId: string = '';
  requestType: string = '';
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  requestDetails?: any;

  constructor(data: Partial<CreateRightsRequestDto> = {}) {
    Object.assign(this, data);
  }
}

export interface DataExportPackage {
  id?: string;
  requestId?: string;
  userId: string;
  data: any;
  format: string;
  downloadUrl?: string;
  dataCategories: any;
  createdAt: Date;
  metadata?: any;
}

export class DataExportPackageDto {
  id?: string;
  requestId?: string;
  userId: string = '';
  data: any = {};
  format: string = DataExportFormat.JSON;
  downloadUrl?: string;
  dataCategories: any = [];
  createdAt: Date = new Date();
  metadata?: any;

  constructor(data: Partial<DataExportPackage> = {}) {
    Object.assign(this, data);
  }
}

export interface ProcessRightsRequestDto {
  requestId: string;
  status: string;
  response?: string;
}

export enum DataSubjectRightType {
  ACCESS = 'access',
  RECTIFICATION = 'rectification',
  ERASURE = 'erasure',
  PORTABILITY = 'portability',
}

export interface DataSubjectRightsRequest {
  id: string;
  userId: string;
  type: DataSubjectRightType;
  requestType: DataSubjectRightType;
  status: string;
  createdAt: Date;
  identityVerificationStatus: IdentityVerificationStatus;
  requestDate: Date;
  updatedAt: Date;
}

export class DataSubjectRightsRequestDto {
  id: string = '';
  userId: string = '';
  type: DataSubjectRightType = DataSubjectRightType.ACCESS;
  requestType: DataSubjectRightType = DataSubjectRightType.ACCESS;
  status: string = RequestStatus.PENDING;
  createdAt: Date = new Date();
  identityVerificationStatus: IdentityVerificationStatus =
    IdentityVerificationStatus.PENDING;
  requestDate: Date = new Date();
  updatedAt: Date = new Date();

  constructor(data: Partial<DataSubjectRightsRequest> = {}) {
    Object.assign(this, data);
  }
}

export enum RequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

export enum DataExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  XML = 'xml',
}

export enum IdentityVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export interface UserPreferences {
  language?: string;
  timezone?: string;
  notifications?: {
    email?: boolean;
    browser?: boolean;
    mobile?: boolean;
    push?: boolean;
    sms?: boolean;
  };
}

export interface UserPreferencesDto {
  language?: string;
  timezone?: string;
  notifications?: {
    email?: boolean;
    browser?: boolean;
    mobile?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  userId?: string;
}

export interface UserActivityDto {
  id: string;
  userId: string;
  type: string;
  description: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export enum ConsentPurpose {
  ESSENTIAL_SERVICES = 'essential_services',
  BEHAVIORAL_ANALYTICS = 'behavioral_analytics',
  MARKETING_COMMUNICATIONS = 'marketing_communications',
  FUNCTIONAL_ANALYTICS = 'functional_analytics',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  PERSONALIZATION = 'personalization',
  PERFORMANCE_MONITORING = 'performance_monitoring',
  // Additional values referenced in privacy service
  RESUME_PROCESSING = 'resume_processing',
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  COMMUNICATION = 'communication',
}

// Add missing enums and utilities
export enum EventType {
  USER_INTERACTION = 'user_interaction',
  USER_ACTION = 'user_action',
  SYSTEM_EVENT = 'system_event',
  ERROR_EVENT = 'error_event',
  PERFORMANCE_EVENT = 'performance_event',
}

export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  ANONYMIZED = 'anonymized',
}

export enum EventCategory {
  AUTHENTICATION = 'authentication',
  ANALYTICS = 'analytics',
  SYSTEM = 'system',
  USER = 'user',
}

export enum ConsentStatus {
  PENDING = 'pending',
  GRANTED = 'granted',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn',
}

// Re-export no-op ErrorInterceptorFactory for compatibility in tests
export { ErrorInterceptorFactory } from '@ai-recruitment-clerk/infrastructure-shared';

// Add circuit breaker decorator
export function WithCircuitBreaker(nameOrConfig?: string | any, config?: any) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const circuitName =
      typeof nameOrConfig === 'string' ? nameOrConfig : propertyName;
    const circuitConfig =
      typeof nameOrConfig === 'string' ? config : nameOrConfig;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        console.error(`Circuit breaker triggered for ${circuitName}:`, error);
        throw error;
      }
    };
  };
}

// Add retry utility
export class RetryUtility {
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts) break;
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError;
  }
}

// Questionnaire DTOs and Enums
export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TEXT = 'text',
  RATING = 'rating',
  DATE = 'date',
}

export enum QuestionnaireStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export class QuestionnaireDto {
  id = '';
  title = '';
  description?: string;
  status: QuestionnaireStatus = QuestionnaireStatus.DRAFT;
  questions: any[] = [];
  createdBy = '';
  organizationId = '';
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
}

export interface CreateQuestionnaireDto {
  title: string;
  description?: string;
  questions: any[];
  organizationId?: string;
}

export interface UpdateQuestionnaireDto {
  title?: string;
  description?: string;
  questions?: any[];
  status?: QuestionnaireStatus;
}

export interface QuestionnaireSubmissionDto {
  questionnaireId: string;
  answers: any[];
  submittedBy?: string;
  metadata?: any;
}

export class QuestionnaireResponseDto {
  id = '';
  questionnaireId = '';
  answers: any[] = [];
  submittedBy = '';
  submittedAt: Date = new Date();
  metadata?: any;
}

export class QuestionnaireAnalyticsDto {
  questionnaireId = '';
  totalSubmissions = 0;
  averageCompletionTime = 0;
  responseRate = 0;
  analytics: any = {};
}

export class QuestionnaireTemplateDto {
  id = '';
  name = '';
  template: any = {};
  category = '';
}

// Resume DTOs for fallback
export class ResumeDto {
  id = '';
  fileName = '';
  uploadedBy = '';
  status = 'uploaded';
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
}

export class ResumeAnalysisDto {
  resumeId = '';
  skills: string[] = [];
  experience: any[] = [];
  education: any[] = [];
  score = 0;
}

export interface ResumeUploadDto {
  fileName: string;
  fileContent: Buffer;
  jobId?: string;
  uploadedBy: string;
  candidateName?: string;
  candidateEmail?: string;
  notes?: string;
  tags?: string[];
}

export interface ResumeStatusUpdateDto {
  resumeId: string;
  status: string;
  notes?: string;
  reason?: string;
}

export interface ResumeSearchDto {
  keywords?: string[];
  skills?: string[];
  experience?: number;
  location?: string;
}

export class ResumeSkillsAnalysisDto {
  resumeId = '';
  extractedSkills: string[] = [];
  requiredSkills: string[] = [];
  matchScore = 0;
}

// All exports are above - questionnaire DTOs are already defined as export interfaces
