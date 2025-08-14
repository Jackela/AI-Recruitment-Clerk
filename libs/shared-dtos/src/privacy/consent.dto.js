"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentRenewalNotification = exports.BulkConsentUpdateDto = exports.ConsentAuditLog = exports.ConsentManagementConfig = exports.ProcessingPurposeInfo = exports.ConsentStatusDto = exports.WithdrawConsentDto = exports.ConsentGrantDto = exports.CaptureConsentDto = exports.CookieConsentDto = exports.UserConsentProfile = exports.CookieConsentRecord = exports.ConsentRecord = exports.DataCategory = exports.ConsentMethod = exports.ConsentPurpose = exports.ConsentStatus = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
/**
 * GDPR Consent Management DTOs
 * Implements comprehensive consent tracking and management for GDPR compliance
 */
var ConsentStatus;
(function (ConsentStatus) {
    ConsentStatus["GRANTED"] = "granted";
    ConsentStatus["DENIED"] = "denied";
    ConsentStatus["PENDING"] = "pending";
    ConsentStatus["WITHDRAWN"] = "withdrawn";
    ConsentStatus["NOT_APPLICABLE"] = "not_applicable";
})(ConsentStatus || (exports.ConsentStatus = ConsentStatus = {}));
var ConsentPurpose;
(function (ConsentPurpose) {
    ConsentPurpose["ESSENTIAL_SERVICES"] = "essential_services";
    ConsentPurpose["FUNCTIONAL_ANALYTICS"] = "functional_analytics";
    ConsentPurpose["MARKETING_COMMUNICATIONS"] = "marketing_communications";
    ConsentPurpose["BEHAVIORAL_ANALYTICS"] = "behavioral_analytics";
    ConsentPurpose["THIRD_PARTY_SHARING"] = "third_party_sharing";
    ConsentPurpose["PERSONALIZATION"] = "personalization";
    ConsentPurpose["PERFORMANCE_MONITORING"] = "performance_monitoring"; // Legitimate interest
})(ConsentPurpose || (exports.ConsentPurpose = ConsentPurpose = {}));
var ConsentMethod;
(function (ConsentMethod) {
    ConsentMethod["EXPLICIT_OPT_IN"] = "explicit_opt_in";
    ConsentMethod["IMPLIED_CONSENT"] = "implied_consent";
    ConsentMethod["GRANULAR_CHOICE"] = "granular_choice";
    ConsentMethod["CONTINUED_USE"] = "continued_use";
    ConsentMethod["LEGAL_REQUIREMENT"] = "legal_requirement"; // Regulatory obligation
})(ConsentMethod || (exports.ConsentMethod = ConsentMethod = {}));
var DataCategory;
(function (DataCategory) {
    DataCategory["AUTHENTICATION"] = "authentication";
    DataCategory["PROFILE_INFORMATION"] = "profile_information";
    DataCategory["RESUME_CONTENT"] = "resume_content";
    DataCategory["JOB_PREFERENCES"] = "job_preferences";
    DataCategory["BEHAVIORAL_DATA"] = "behavioral_data";
    DataCategory["DEVICE_INFORMATION"] = "device_information";
    DataCategory["COMMUNICATION_PREFERENCES"] = "communication_preferences";
    DataCategory["SYSTEM_LOGS"] = "system_logs";
})(DataCategory || (exports.DataCategory = DataCategory = {}));
/**
 * Individual consent record for a specific purpose
 */
class ConsentRecord {
}
exports.ConsentRecord = ConsentRecord;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConsentRecord.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConsentRecord.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ConsentPurpose),
    __metadata("design:type", String)
], ConsentRecord.prototype, "purpose", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ConsentStatus),
    __metadata("design:type", String)
], ConsentRecord.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ConsentMethod),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsentRecord.prototype, "consentMethod", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(DataCategory, { each: true }),
    __metadata("design:type", Array)
], ConsentRecord.prototype, "dataCategories", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsentRecord.prototype, "legalBasis", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], ConsentRecord.prototype, "consentDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], ConsentRecord.prototype, "withdrawalDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], ConsentRecord.prototype, "expiryDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsentRecord.prototype, "consentText", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsentRecord.prototype, "withdrawalReason", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsentRecord.prototype, "ipAddress", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsentRecord.prototype, "userAgent", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ConsentRecord.prototype, "metadata", void 0);
/**
 * Cookie consent specific configuration
 */
class CookieConsentRecord {
}
exports.CookieConsentRecord = CookieConsentRecord;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CookieConsentRecord.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CookieConsentRecord.prototype, "essential", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CookieConsentRecord.prototype, "functional", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CookieConsentRecord.prototype, "analytics", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CookieConsentRecord.prototype, "marketing", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], CookieConsentRecord.prototype, "consentDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], CookieConsentRecord.prototype, "expiryDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CookieConsentRecord.prototype, "consentVersion", void 0);
/**
 * Comprehensive user consent profile
 */
class UserConsentProfile {
    /**
     * Check if user has valid consent for a specific purpose
     */
    hasValidConsent(purpose) {
        const record = this.consentRecords.find(r => r.purpose === purpose);
        if (!record)
            return false;
        if (record.status !== ConsentStatus.GRANTED)
            return false;
        // Check expiry
        if (record.expiryDate && new Date() > new Date(record.expiryDate)) {
            return false;
        }
        return true;
    }
    /**
     * Get all granted purposes
     */
    getGrantedPurposes() {
        return this.consentRecords
            .filter(r => r.status === ConsentStatus.GRANTED)
            .filter(r => !r.expiryDate || new Date() <= new Date(r.expiryDate))
            .map(r => r.purpose);
    }
    /**
     * Check if consent needs renewal
     */
    needsConsentRenewal() {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return this.lastConsentUpdate < oneYearAgo;
    }
}
exports.UserConsentProfile = UserConsentProfile;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UserConsentProfile.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ConsentRecord),
    __metadata("design:type", Array)
], UserConsentProfile.prototype, "consentRecords", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CookieConsentRecord),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", CookieConsentRecord)
], UserConsentProfile.prototype, "cookieConsent", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UserConsentProfile.prototype, "preferredLanguage", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], UserConsentProfile.prototype, "lastConsentUpdate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UserConsentProfile.prototype, "consentVersion", void 0);
/**
 * Cookie consent preferences
 */
class CookieConsentDto {
}
exports.CookieConsentDto = CookieConsentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CookieConsentDto.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CookieConsentDto.prototype, "functional", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CookieConsentDto.prototype, "analytics", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CookieConsentDto.prototype, "marketing", void 0);
/**
 * Consent capture request from frontend
 */
class CaptureConsentDto {
}
exports.CaptureConsentDto = CaptureConsentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CaptureConsentDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ConsentGrantDto),
    __metadata("design:type", Array)
], CaptureConsentDto.prototype, "consents", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CookieConsentDto),
    __metadata("design:type", CookieConsentDto)
], CaptureConsentDto.prototype, "cookieConsent", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CaptureConsentDto.prototype, "ipAddress", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CaptureConsentDto.prototype, "userAgent", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CaptureConsentDto.prototype, "consentVersion", void 0);
class ConsentGrantDto {
}
exports.ConsentGrantDto = ConsentGrantDto;
__decorate([
    (0, class_validator_1.IsEnum)(ConsentPurpose),
    __metadata("design:type", String)
], ConsentGrantDto.prototype, "purpose", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ConsentGrantDto.prototype, "granted", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ConsentMethod),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsentGrantDto.prototype, "method", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(DataCategory, { each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], ConsentGrantDto.prototype, "dataCategories", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsentGrantDto.prototype, "consentText", void 0);
/**
 * Consent withdrawal request
 */
class WithdrawConsentDto {
}
exports.WithdrawConsentDto = WithdrawConsentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], WithdrawConsentDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ConsentPurpose),
    __metadata("design:type", String)
], WithdrawConsentDto.prototype, "purpose", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], WithdrawConsentDto.prototype, "reason", void 0);
/**
 * Consent status query response
 */
class ConsentStatusDto {
}
exports.ConsentStatusDto = ConsentStatusDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConsentStatusDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], ConsentStatusDto.prototype, "purposes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ConsentStatusDto.prototype, "cookieConsent", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ConsentStatusDto.prototype, "needsRenewal", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], ConsentStatusDto.prototype, "lastUpdated", void 0);
/**
 * Data processing purpose metadata
 */
class ProcessingPurposeInfo {
}
exports.ProcessingPurposeInfo = ProcessingPurposeInfo;
__decorate([
    (0, class_validator_1.IsEnum)(ConsentPurpose),
    __metadata("design:type", String)
], ProcessingPurposeInfo.prototype, "purpose", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ProcessingPurposeInfo.prototype, "displayName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ProcessingPurposeInfo.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ProcessingPurposeInfo.prototype, "legalBasis", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(DataCategory, { each: true }),
    __metadata("design:type", Array)
], ProcessingPurposeInfo.prototype, "dataCategories", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProcessingPurposeInfo.prototype, "isRequired", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProcessingPurposeInfo.prototype, "isOptOut", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ProcessingPurposeInfo.prototype, "retentionPeriod", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], ProcessingPurposeInfo.prototype, "thirdParties", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], ProcessingPurposeInfo.prototype, "dataRecipients", void 0);
/**
 * Complete consent management configuration
 */
class ConsentManagementConfig {
}
exports.ConsentManagementConfig = ConsentManagementConfig;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ProcessingPurposeInfo),
    __metadata("design:type", Array)
], ConsentManagementConfig.prototype, "purposes", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConsentManagementConfig.prototype, "consentVersion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConsentManagementConfig.prototype, "privacyPolicyUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsentManagementConfig.prototype, "cookiePolicyUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ConsentManagementConfig.prototype, "cookieSettings", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ConsentManagementConfig.prototype, "renewal", void 0);
/**
 * Consent audit log entry
 */
class ConsentAuditLog {
}
exports.ConsentAuditLog = ConsentAuditLog;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConsentAuditLog.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConsentAuditLog.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConsentAuditLog.prototype, "action", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ConsentPurpose),
    __metadata("design:type", String)
], ConsentAuditLog.prototype, "purpose", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ConsentStatus),
    __metadata("design:type", String)
], ConsentAuditLog.prototype, "previousStatus", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ConsentStatus),
    __metadata("design:type", String)
], ConsentAuditLog.prototype, "newStatus", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsentAuditLog.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsentAuditLog.prototype, "ipAddress", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConsentAuditLog.prototype, "userAgent", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ConsentAuditLog.prototype, "metadata", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], ConsentAuditLog.prototype, "timestamp", void 0);
/**
 * Bulk consent operation for data migration
 */
class BulkConsentUpdateDto {
}
exports.BulkConsentUpdateDto = BulkConsentUpdateDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], BulkConsentUpdateDto.prototype, "userIds", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ConsentPurpose),
    __metadata("design:type", String)
], BulkConsentUpdateDto.prototype, "purpose", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ConsentStatus),
    __metadata("design:type", String)
], BulkConsentUpdateDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BulkConsentUpdateDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], BulkConsentUpdateDto.prototype, "sendNotification", void 0);
/**
 * Consent renewal notification
 */
class ConsentRenewalNotification {
}
exports.ConsentRenewalNotification = ConsentRenewalNotification;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConsentRenewalNotification.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(ConsentPurpose, { each: true }),
    __metadata("design:type", Array)
], ConsentRenewalNotification.prototype, "expiredPurposes", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], ConsentRenewalNotification.prototype, "expiryDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], ConsentRenewalNotification.prototype, "reminderSentAt", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ConsentRenewalNotification.prototype, "isUrgent", void 0);
