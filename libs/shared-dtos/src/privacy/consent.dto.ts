import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
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
  NOT_APPLICABLE = 'not_applicable',
}

export enum ConsentPurpose {
  ESSENTIAL_SERVICES = 'essential_services', // Contract performance
  FUNCTIONAL_ANALYTICS = 'functional_analytics', // Legitimate interest
  MARKETING_COMMUNICATIONS = 'marketing_communications', // Consent required
  BEHAVIORAL_ANALYTICS = 'behavioral_analytics', // Consent required
  THIRD_PARTY_SHARING = 'third_party_sharing', // Consent required
  PERSONALIZATION = 'personalization', // Legitimate interest/Consent
  PERFORMANCE_MONITORING = 'performance_monitoring', // Legitimate interest
  // Additional purposes for privacy compliance service
  RESUME_PROCESSING = 'resume_processing', // Resume analysis and matching
  MARKETING = 'marketing', // General marketing activities
  ANALYTICS = 'analytics', // General analytics collection
  COMMUNICATION = 'communication', // Communication preferences
}

export enum ConsentMethod {
  EXPLICIT_OPT_IN = 'explicit_opt_in', // Article 7 compliant
  IMPLIED_CONSENT = 'implied_consent', // For legitimate interests
  GRANULAR_CHOICE = 'granular_choice', // Per-purpose consent
  CONTINUED_USE = 'continued_use', // Service continuation
  LEGAL_REQUIREMENT = 'legal_requirement', // Regulatory obligation
}

export enum DataCategory {
  AUTHENTICATION = 'authentication',
  PROFILE_INFORMATION = 'profile_information',
  RESUME_CONTENT = 'resume_content',
  JOB_PREFERENCES = 'job_preferences',
  BEHAVIORAL_DATA = 'behavioral_data',
  DEVICE_INFORMATION = 'device_information',
  COMMUNICATION_PREFERENCES = 'communication_preferences',
  SYSTEM_LOGS = 'system_logs',
  PERFORMANCE_DATA = 'performance_data',
  GENERAL = 'general',
}

/**
 * Individual consent record for a specific purpose
 */
export class ConsentRecord {
  @IsString()
  @IsNotEmpty()
  public id!: string;

  @IsString()
  @IsNotEmpty()
  public userId!: string;

  @IsEnum(ConsentPurpose)
  public purpose!: ConsentPurpose;

  @IsEnum(ConsentStatus)
  public status!: ConsentStatus;

  @IsEnum(ConsentMethod)
  @IsOptional()
  public consentMethod?: ConsentMethod;

  @IsArray()
  @IsEnum(DataCategory, { each: true })
  public dataCategories!: DataCategory[];

  @IsString()
  @IsOptional()
  public legalBasis?: string; // GDPR Article 6 basis

  @IsDateString()
  public consentDate!: Date;

  @IsDateString()
  @IsOptional()
  public withdrawalDate?: Date;

  @IsDateString()
  @IsOptional()
  public expiryDate?: Date; // For time-limited consent

  @IsString()
  @IsOptional()
  public consentText?: string; // Text presented to user

  @IsString()
  @IsOptional()
  public withdrawalReason?: string;

  @IsString()
  @IsOptional()
  public ipAddress?: string; // Proof of consent

  @IsString()
  @IsOptional()
  public userAgent?: string; // Technical consent context

  @IsOptional()
  public metadata?: Record<string, unknown>;

  public createdAt!: Date;
  public updatedAt!: Date;
}

/**
 * Cookie consent specific configuration
 */
export class CookieConsentRecord {
  @IsString()
  @IsNotEmpty()
  public deviceId!: string;

  @IsBoolean()
  public essential!: boolean; // Always true, cannot be denied

  @IsBoolean()
  public functional!: boolean;

  @IsBoolean()
  public analytics!: boolean;

  @IsBoolean()
  public marketing!: boolean;

  @IsDateString()
  public consentDate!: Date;

  @IsDateString()
  @IsOptional()
  public expiryDate?: Date;

  @IsString()
  @IsOptional()
  public consentVersion?: string;

  public createdAt!: Date;
  public updatedAt!: Date;
}

/**
 * Comprehensive user consent profile
 */
export class UserConsentProfile {
  @IsString()
  @IsNotEmpty()
  public userId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentRecord)
  public consentRecords!: ConsentRecord[];

  @ValidateNested()
  @Type(() => CookieConsentRecord)
  @IsOptional()
  public cookieConsent?: CookieConsentRecord;

  @IsString()
  @IsOptional()
  public preferredLanguage?: string;

  @IsDateString()
  public lastConsentUpdate!: Date;

  @IsString()
  @IsOptional()
  public consentVersion?: string; // Version of consent framework

  public createdAt!: Date;
  public updatedAt!: Date;

  /**
   * Check if user has valid consent for a specific purpose
   */
  public hasValidConsent(purpose: ConsentPurpose): boolean {
    const record = this.consentRecords.find((r) => r.purpose === purpose);
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
  public getGrantedPurposes(): ConsentPurpose[] {
    return this.consentRecords
      .filter((r) => r.status === ConsentStatus.GRANTED)
      .filter((r) => !r.expiryDate || new Date() <= new Date(r.expiryDate))
      .map((r) => r.purpose);
  }

  /**
   * Check if consent needs renewal
   */
  public needsConsentRenewal(): boolean {
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
  public deviceId!: string;

  @IsBoolean()
  public functional!: boolean;

  @IsBoolean()
  public analytics!: boolean;

  @IsBoolean()
  public marketing!: boolean;
}

/**
 * Consent capture request from frontend
 */
export class CaptureConsentDto {
  @IsString()
  @IsNotEmpty()
  public userId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentGrantDto)
  public consents!: ConsentGrantDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CookieConsentDto)
  public cookieConsent?: CookieConsentDto;

  @IsString()
  @IsOptional()
  public ipAddress?: string;

  @IsString()
  @IsOptional()
  public userAgent?: string;

  @IsString()
  @IsOptional()
  public consentVersion?: string;
}

/**
 * Describes the consent grant data transfer object.
 */
export class ConsentGrantDto {
  @IsEnum(ConsentPurpose)
  public purpose!: ConsentPurpose;

  @IsBoolean()
  public granted!: boolean;

  @IsEnum(ConsentMethod)
  @IsOptional()
  public method?: ConsentMethod;

  @IsArray()
  @IsEnum(DataCategory, { each: true })
  @IsOptional()
  public dataCategories?: DataCategory[];

  @IsString()
  @IsOptional()
  public consentText?: string;
}

/**
 * Consent withdrawal request
 */
export class WithdrawConsentDto {
  @IsString()
  @IsNotEmpty()
  public userId!: string;

  @IsEnum(ConsentPurpose)
  public purpose!: ConsentPurpose;

  @IsString()
  @IsOptional()
  public reason?: string;
}

/**
 * Consent status query response
 */
export class ConsentStatusDto {
  @IsString()
  public userId!: string;

  @IsArray()
  public purposes!: {
    purpose: ConsentPurpose;
    status: ConsentStatus;
    grantedAt?: Date;
    expiryDate?: Date;
    canWithdraw: boolean;
  }[];

  @IsOptional()
  public cookieConsent?: {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
    consentDate: Date;
  };

  @IsBoolean()
  public needsRenewal!: boolean;

  @IsDateString()
  public lastUpdated!: Date;
}

/**
 * Data processing purpose metadata
 */
export class ProcessingPurposeInfo {
  @IsEnum(ConsentPurpose)
  public purpose!: ConsentPurpose;

  @IsString()
  @IsNotEmpty()
  public displayName!: string;

  @IsString()
  @IsNotEmpty()
  public description!: string;

  @IsString()
  @IsNotEmpty()
  public legalBasis!: string; // GDPR Article 6 basis

  @IsArray()
  @IsEnum(DataCategory, { each: true })
  public dataCategories!: DataCategory[];

  @IsBoolean()
  public isRequired!: boolean; // Cannot be denied

  @IsBoolean()
  public isOptOut!: boolean; // Can be withdrawn

  @IsOptional()
  public retentionPeriod?: string; // e.g., "2 years", "until withdrawal"

  @IsOptional()
  public thirdParties?: string[]; // Third parties involved

  @IsOptional()
  public dataRecipients?: string[]; // Where data is shared
}

/**
 * Complete consent management configuration
 */
export class ConsentManagementConfig {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessingPurposeInfo)
  public purposes!: ProcessingPurposeInfo[];

  @IsString()
  public consentVersion!: string;

  @IsString()
  public privacyPolicyUrl!: string;

  @IsString()
  @IsOptional()
  public cookiePolicyUrl?: string;

  @IsOptional()
  public cookieSettings?: {
    domain: string;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number; // seconds
  };

  @IsOptional()
  public renewal?: {
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
  public id!: string;

  @IsString()
  @IsNotEmpty()
  public userId!: string;

  @IsString()
  @IsNotEmpty()
  public action!: string; // 'grant', 'withdraw', 'renew', 'expire'

  @IsEnum(ConsentPurpose)
  public purpose!: ConsentPurpose;

  @IsEnum(ConsentStatus)
  public previousStatus!: ConsentStatus;

  @IsEnum(ConsentStatus)
  public newStatus!: ConsentStatus;

  @IsString()
  @IsOptional()
  public reason?: string;

  @IsString()
  @IsOptional()
  public ipAddress?: string;

  @IsString()
  @IsOptional()
  public userAgent?: string;

  @IsOptional()
  public metadata?: Record<string, unknown>;

  @IsDateString()
  public timestamp!: Date;
}

/**
 * Bulk consent operation for data migration
 */
export class BulkConsentUpdateDto {
  @IsArray()
  @IsString({ each: true })
  public userIds!: string[];

  @IsEnum(ConsentPurpose)
  public purpose!: ConsentPurpose;

  @IsEnum(ConsentStatus)
  public status!: ConsentStatus;

  @IsString()
  @IsOptional()
  public reason?: string;

  @IsBoolean()
  @IsOptional()
  public sendNotification?: boolean;
}

/**
 * Consent renewal notification
 */
export class ConsentRenewalNotification {
  @IsString()
  @IsNotEmpty()
  public userId!: string;

  @IsArray()
  @IsEnum(ConsentPurpose, { each: true })
  public expiredPurposes!: ConsentPurpose[];

  @IsDateString()
  public expiryDate!: Date;

  @IsDateString()
  public reminderSentAt!: Date;

  @IsBoolean()
  public isUrgent!: boolean; // Less than 7 days to expire
}
