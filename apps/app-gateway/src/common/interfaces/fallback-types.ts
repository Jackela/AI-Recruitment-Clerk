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
  MANAGE_USAGE_POLICY = 'manage_usage_policy'
}

export class UserDto {
  id: string = '';
  email: string = '';
  firstName?: string;
  lastName?: string;
  role: string = '';
  status: string = '';
  organizationId?: string;
  permissions: Permission[] = [];
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
}

export enum IncentiveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid'
}

export enum RewardType {
  MONETARY = 'monetary',
  POINTS = 'points',
  DISCOUNT = 'discount'
}

export enum TriggerType {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic'
}

export enum PaymentMethod {
  WECHAT_PAY = 'wechat_pay',
  ALIPAY = 'alipay',
  BANK_TRANSFER = 'bank_transfer'
}

export enum Currency {
  CNY = 'CNY',
  USD = 'USD'
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

export interface CaptureConsentDto {
  userId: string;
  consents: any[];
  ipAddress?: string;
  userAgent?: string;
  consentVersion?: string;
}

export interface WithdrawConsentDto {
  userId: string;
  purpose: string;
  reason?: string;
}

export interface ConsentStatusDto {
  userId: string;
  purposes: any[];
  needsRenewal: boolean;
  lastUpdated: Date;
}

export interface CreateRightsRequestDto {
  userId: string;
  requestType: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  requestDetails?: any;
}

export interface DataExportPackage {
  requestId?: string;
  userId: string;
  data: any;
  format: string;
  downloadUrl?: string;
  dataCategories: any;
  createdAt: Date;
  metadata?: any;
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
  PORTABILITY = 'portability'
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

export enum RequestStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  REJECTED = 'rejected'
}

export enum DataExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  XML = 'xml'
}

export enum IdentityVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed'
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
  PERFORMANCE_MONITORING = 'performance_monitoring'
}

// Questionnaire DTOs and Enums
export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TEXT = 'text',
  RATING = 'rating',
  DATE = 'date'
}

export enum QuestionnaireStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export class QuestionnaireDto {
  id: string = '';
  title: string = '';
  description?: string;
  status: QuestionnaireStatus = QuestionnaireStatus.DRAFT;
  questions: any[] = [];
  createdBy: string = '';
  organizationId: string = '';
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
  id: string = '';
  questionnaireId: string = '';
  answers: any[] = [];
  submittedBy: string = '';
  submittedAt: Date = new Date();
  metadata?: any;
}

export class QuestionnaireAnalyticsDto {
  questionnaireId: string = '';
  totalSubmissions: number = 0;
  averageCompletionTime: number = 0;
  responseRate: number = 0;
  analytics: any = {};
}

export class QuestionnaireTemplateDto {
  id: string = '';
  name: string = '';
  template: any = {};
  category: string = '';
}

// Resume DTOs for fallback
export class ResumeDto {
  id: string = '';
  fileName: string = '';
  uploadedBy: string = '';
  status: string = 'uploaded';
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
}

export class ResumeAnalysisDto {
  resumeId: string = '';
  skills: string[] = [];
  experience: any[] = [];
  education: any[] = [];
  score: number = 0;
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
  resumeId: string = '';
  extractedSkills: string[] = [];
  requiredSkills: string[] = [];
  matchScore: number = 0;
}