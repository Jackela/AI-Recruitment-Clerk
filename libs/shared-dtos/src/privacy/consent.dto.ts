import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * GDPR Consent Management DTOs
 * Implements comprehensive consent tracking and management for GDPR compliance
 */

export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  PENDING = 'pending',
  WITHDRAWN = 'withdrawn',
  NOT_APPLICABLE = 'not_applicable'
}

export enum ConsentPurpose {
  ESSENTIAL_SERVICES = 'essential_services',           // Contract performance
  FUNCTIONAL_ANALYTICS = 'functional_analytics',       // Legitimate interest
  MARKETING_COMMUNICATIONS = 'marketing_communications', // Consent required
  BEHAVIORAL_ANALYTICS = 'behavioral_analytics',       // Consent required
  THIRD_PARTY_SHARING = 'third_party_sharing',        // Consent required
  PERSONALIZATION = 'personalization',                // Legitimate interest/Consent
  PERFORMANCE_MONITORING = 'performance_monitoring'    // Legitimate interest
}

export enum ConsentMethod {
  EXPLICIT_OPT_IN = 'explicit_opt_in',           // Article 7 compliant
  IMPLIED_CONSENT = 'implied_consent',           // For legitimate interests
  GRANULAR_CHOICE = 'granular_choice',          // Per-purpose consent
  CONTINUED_USE = 'continued_use',              // Service continuation
  LEGAL_REQUIREMENT = 'legal_requirement'       // Regulatory obligation
}

export enum DataCategory {
  AUTHENTICATION = 'authentication',
  PROFILE_INFORMATION = 'profile_information',
  RESUME_CONTENT = 'resume_content',
  JOB_PREFERENCES = 'job_preferences',
  BEHAVIORAL_DATA = 'behavioral_data',
  DEVICE_INFORMATION = 'device_information',
  COMMUNICATION_PREFERENCES = 'communication_preferences',
  SYSTEM_LOGS = 'system_logs'
}

/**
 * Individual consent record for a specific purpose
 */
export class ConsentRecord {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(ConsentPurpose)
  purpose!: ConsentPurpose;

  @IsEnum(ConsentStatus)
  status!: ConsentStatus;

  @IsEnum(ConsentMethod)
  @IsOptional()
  consentMethod?: ConsentMethod;

  @IsArray()
  @IsEnum(DataCategory, { each: true })
  dataCategories!: DataCategory[];

  @IsString()
  @IsOptional()
  legalBasis?: string; // GDPR Article 6 basis

  @IsDateString()
  consentDate!: Date;

  @IsDateString()
  @IsOptional()
  withdrawalDate?: Date;

  @IsDateString()
  @IsOptional()
  expiryDate?: Date; // For time-limited consent

  @IsString()
  @IsOptional()
  consentText?: string; // Text presented to user

  @IsString()
  @IsOptional()
  withdrawalReason?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string; // Proof of consent

  @IsString()
  @IsOptional()
  userAgent?: string; // Technical consent context

  @IsOptional()
  metadata?: Record<string, any>;

  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Cookie consent specific configuration
 */
export class CookieConsentRecord {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsBoolean()
  essential!: boolean; // Always true, cannot be denied

  @IsBoolean()
  functional!: boolean;

  @IsBoolean()
  analytics!: boolean;

  @IsBoolean()
  marketing!: boolean;

  @IsDateString()
  consentDate!: Date;

  @IsDateString()
  @IsOptional()
  expiryDate?: Date;

  @IsString()
  @IsOptional()
  consentVersion?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Comprehensive user consent profile
 */
export class UserConsentProfile {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentRecord)
  consentRecords!: ConsentRecord[];

  @ValidateNested()
  @Type(() => CookieConsentRecord)
  @IsOptional()
  cookieConsent?: CookieConsentRecord;

  @IsString()
  @IsOptional()
  preferredLanguage?: string;

  @IsDateString()
  lastConsentUpdate!: Date;

  @IsString()
  @IsOptional()
  consentVersion?: string; // Version of consent framework

  createdAt!: Date;
  updatedAt!: Date;

  /**
   * Check if user has valid consent for a specific purpose
   */
  hasValidConsent(purpose: ConsentPurpose): boolean {
    const record = this.consentRecords.find(r => r.purpose === purpose);
    if (!record) return false;

    if (record.status !== ConsentStatus.GRANTED) return false;

    // Check expiry
    if (record.expiryDate && new Date() > new Date(record.expiryDate)) {
      return false;
    }

    return true;
  }

  /**
   * Get all granted purposes
   */
  getGrantedPurposes(): ConsentPurpose[] {
    return this.consentRecords
      .filter(r => r.status === ConsentStatus.GRANTED)
      .filter(r => !r.expiryDate || new Date() <= new Date(r.expiryDate))
      .map(r => r.purpose);
  }

  /**
   * Check if consent needs renewal
   */
  needsConsentRenewal(): boolean {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return this.lastConsentUpdate < oneYearAgo;
  }
}

/**
 * Cookie consent preferences
 */
export class CookieConsentDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsBoolean()
  functional!: boolean;

  @IsBoolean()
  analytics!: boolean;

  @IsBoolean()
  marketing!: boolean;
}

/**
 * Consent capture request from frontend
 */
export class CaptureConsentDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentGrantDto)
  consents!: ConsentGrantDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CookieConsentDto)
  cookieConsent?: CookieConsentDto;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  consentVersion?: string;
}

export class ConsentGrantDto {
  @IsEnum(ConsentPurpose)
  purpose!: ConsentPurpose;

  @IsBoolean()
  granted!: boolean;

  @IsEnum(ConsentMethod)
  @IsOptional()
  method?: ConsentMethod;

  @IsArray()
  @IsEnum(DataCategory, { each: true })
  @IsOptional()
  dataCategories?: DataCategory[];

  @IsString()
  @IsOptional()
  consentText?: string;
}

/**
 * Consent withdrawal request
 */
export class WithdrawConsentDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(ConsentPurpose)
  purpose!: ConsentPurpose;

  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * Consent status query response
 */
export class ConsentStatusDto {
  @IsString()
  userId!: string;

  @IsArray()
  purposes!: {
    purpose: ConsentPurpose;
    status: ConsentStatus;
    grantedAt?: Date;
    expiryDate?: Date;
    canWithdraw: boolean;
  }[];

  @IsOptional()
  cookieConsent?: {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
    consentDate: Date;
  };

  @IsBoolean()
  needsRenewal!: boolean;

  @IsDateString()
  lastUpdated!: Date;
}

/**
 * Data processing purpose metadata
 */
export class ProcessingPurposeInfo {
  @IsEnum(ConsentPurpose)
  purpose!: ConsentPurpose;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  legalBasis!: string; // GDPR Article 6 basis

  @IsArray()
  @IsEnum(DataCategory, { each: true })
  dataCategories!: DataCategory[];

  @IsBoolean()
  isRequired!: boolean; // Cannot be denied

  @IsBoolean()
  isOptOut!: boolean; // Can be withdrawn

  @IsOptional()
  retentionPeriod?: string; // e.g., "2 years", "until withdrawal"

  @IsOptional()
  thirdParties?: string[]; // Third parties involved

  @IsOptional()
  dataRecipients?: string[]; // Where data is shared
}

/**
 * Complete consent management configuration
 */
export class ConsentManagementConfig {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessingPurposeInfo)
  purposes!: ProcessingPurposeInfo[];

  @IsString()
  consentVersion!: string;

  @IsString()
  privacyPolicyUrl!: string;

  @IsString()
  @IsOptional()
  cookiePolicyUrl?: string;

  @IsOptional()
  cookieSettings?: {
    domain: string;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number; // seconds
  };

  @IsOptional()
  renewal?: {
    enabled: boolean;
    intervalMonths: number;
    gracePeriodsMonths: number;
  };
}

/**
 * Consent audit log entry
 */
export class ConsentAuditLog {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  action!: string; // 'grant', 'withdraw', 'renew', 'expire'

  @IsEnum(ConsentPurpose)
  purpose!: ConsentPurpose;

  @IsEnum(ConsentStatus)
  previousStatus!: ConsentStatus;

  @IsEnum(ConsentStatus)
  newStatus!: ConsentStatus;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsDateString()
  timestamp!: Date;
}

/**
 * Bulk consent operation for data migration
 */
export class BulkConsentUpdateDto {
  @IsArray()
  @IsString({ each: true })
  userIds!: string[];

  @IsEnum(ConsentPurpose)
  purpose!: ConsentPurpose;

  @IsEnum(ConsentStatus)
  status!: ConsentStatus;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsBoolean()
  @IsOptional()
  sendNotification?: boolean;
}

/**
 * Consent renewal notification
 */
export class ConsentRenewalNotification {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsArray()
  @IsEnum(ConsentPurpose, { each: true })
  expiredPurposes!: ConsentPurpose[];

  @IsDateString()
  expiryDate!: Date;

  @IsDateString()
  reminderSentAt!: Date;

  @IsBoolean()
  isUrgent!: boolean; // Less than 7 days to expire
}