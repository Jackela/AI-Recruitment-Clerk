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
exports.UpdateRetentionStatusDto = exports.CreateBreachRecordDto = exports.CreateDataProcessingRecordDto = exports.PrivacyComplianceCheck = exports.CrossBorderTransfer = exports.BreachNotification = exports.DataBreachRecord = exports.RiskAssessment = exports.PrivacyImpactAssessment = exports.DataRetentionRecord = exports.DataRetentionPolicy = exports.SecurityMeasure = exports.ThirdPartyTransfer = exports.DataProcessingRecord = exports.BreachStatus = exports.BreachType = exports.BreachSeverity = exports.DataRetentionStatus = exports.ProcessingLegalBasis = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
/**
 * Privacy Infrastructure DTOs
 * Data Processing Records (Article 30), Breach Notifications, Retention Policies
 */
var ProcessingLegalBasis;
(function (ProcessingLegalBasis) {
    ProcessingLegalBasis["CONSENT"] = "consent";
    ProcessingLegalBasis["CONTRACT"] = "contract";
    ProcessingLegalBasis["LEGAL_OBLIGATION"] = "legal_obligation";
    ProcessingLegalBasis["VITAL_INTERESTS"] = "vital_interests";
    ProcessingLegalBasis["PUBLIC_TASK"] = "public_task";
    ProcessingLegalBasis["LEGITIMATE_INTERESTS"] = "legitimate_interests"; // Article 6(1)(f)
})(ProcessingLegalBasis || (exports.ProcessingLegalBasis = ProcessingLegalBasis = {}));
var DataRetentionStatus;
(function (DataRetentionStatus) {
    DataRetentionStatus["ACTIVE"] = "active";
    DataRetentionStatus["PENDING_DELETION"] = "pending_deletion";
    DataRetentionStatus["ANONYMIZED"] = "anonymized";
    DataRetentionStatus["DELETED"] = "deleted";
    DataRetentionStatus["ARCHIVED"] = "archived";
    DataRetentionStatus["LEGAL_HOLD"] = "legal_hold";
})(DataRetentionStatus || (exports.DataRetentionStatus = DataRetentionStatus = {}));
var BreachSeverity;
(function (BreachSeverity) {
    BreachSeverity["LOW"] = "low";
    BreachSeverity["MEDIUM"] = "medium";
    BreachSeverity["HIGH"] = "high";
    BreachSeverity["CRITICAL"] = "critical";
})(BreachSeverity || (exports.BreachSeverity = BreachSeverity = {}));
var BreachType;
(function (BreachType) {
    BreachType["CONFIDENTIALITY"] = "confidentiality";
    BreachType["INTEGRITY"] = "integrity";
    BreachType["AVAILABILITY"] = "availability"; // Loss of access/destruction
})(BreachType || (exports.BreachType = BreachType = {}));
var BreachStatus;
(function (BreachStatus) {
    BreachStatus["DETECTED"] = "detected";
    BreachStatus["INVESTIGATING"] = "investigating";
    BreachStatus["CONTAINED"] = "contained";
    BreachStatus["NOTIFIED_AUTHORITY"] = "notified_authority";
    BreachStatus["NOTIFIED_SUBJECTS"] = "notified_subjects";
    BreachStatus["RESOLVED"] = "resolved";
    BreachStatus["CLOSED"] = "closed";
})(BreachStatus || (exports.BreachStatus = BreachStatus = {}));
/**
 * Data Processing Record (Article 30 GDPR)
 * Mandatory records of processing activities
 */
class DataProcessingRecord {
}
exports.DataProcessingRecord = DataProcessingRecord;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "dataController", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "dataProcessorService", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], DataProcessingRecord.prototype, "purposesOfProcessing", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], DataProcessingRecord.prototype, "categoriesOfDataSubjects", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], DataProcessingRecord.prototype, "categoriesOfPersonalData", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DataProcessingRecord.prototype, "categoriesOfRecipients", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ThirdPartyTransfer),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DataProcessingRecord.prototype, "thirdPartyTransfers", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "retentionPeriod", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SecurityMeasure),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DataProcessingRecord.prototype, "technicalSafeguards", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ProcessingLegalBasis),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "legalBasis", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "legitimateInterestsAssessment", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], DataProcessingRecord.prototype, "involvesSpecialCategories", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "specialCategoriesLegalBasis", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], DataProcessingRecord.prototype, "involvesAutomatedDecisionMaking", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "automatedDecisionMakingLogic", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], DataProcessingRecord.prototype, "lastReview", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "reviewedBy", void 0);
class ThirdPartyTransfer {
}
exports.ThirdPartyTransfer = ThirdPartyTransfer;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ThirdPartyTransfer.prototype, "recipient", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ThirdPartyTransfer.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ThirdPartyTransfer.prototype, "adequacyDecision", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], ThirdPartyTransfer.prototype, "safeguards", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ThirdPartyTransfer.prototype, "purpose", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], ThirdPartyTransfer.prototype, "dataCategories", void 0);
class SecurityMeasure {
}
exports.SecurityMeasure = SecurityMeasure;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SecurityMeasure.prototype, "measure", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SecurityMeasure.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SecurityMeasure.prototype, "implementation", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], SecurityMeasure.prototype, "lastAssessed", void 0);
/**
 * Data Retention Policy
 */
class DataRetentionPolicy {
}
exports.DataRetentionPolicy = DataRetentionPolicy;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DataRetentionPolicy.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataRetentionPolicy.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataRetentionPolicy.prototype, "dataCategory", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataRetentionPolicy.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DataRetentionPolicy.prototype, "retentionPeriodDays", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataRetentionPolicy.prototype, "retentionBasis", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(DataRetentionStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataRetentionPolicy.prototype, "defaultAction", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], DataRetentionPolicy.prototype, "allowUserDeletion", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], DataRetentionPolicy.prototype, "hasLegalHoldExemption", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DataRetentionPolicy.prototype, "applicableServices", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], DataRetentionPolicy.prototype, "automationRules", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], DataRetentionPolicy.prototype, "isActive", void 0);
/**
 * Data retention tracking for individual records
 */
class DataRetentionRecord {
}
exports.DataRetentionRecord = DataRetentionRecord;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DataRetentionRecord.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataRetentionRecord.prototype, "dataIdentifier", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataRetentionRecord.prototype, "dataCategory", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DataRetentionRecord.prototype, "retentionPolicyId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], DataRetentionRecord.prototype, "dataCreated", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], DataRetentionRecord.prototype, "retentionExpiry", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(DataRetentionStatus),
    __metadata("design:type", String)
], DataRetentionRecord.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], DataRetentionRecord.prototype, "deletionScheduled", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], DataRetentionRecord.prototype, "deletionCompleted", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataRetentionRecord.prototype, "legalHoldReason", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataRetentionRecord.prototype, "notes", void 0);
/**
 * Privacy Impact Assessment (DPIA)
 */
class PrivacyImpactAssessment {
}
exports.PrivacyImpactAssessment = PrivacyImpactAssessment;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PrivacyImpactAssessment.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PrivacyImpactAssessment.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PrivacyImpactAssessment.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PrivacyImpactAssessment.prototype, "projectOwner", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PrivacyImpactAssessment.prototype, "dataController", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], PrivacyImpactAssessment.prototype, "processingPurposes", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], PrivacyImpactAssessment.prototype, "dataCategories", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], PrivacyImpactAssessment.prototype, "dataSubjects", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], PrivacyImpactAssessment.prototype, "riskAssessment", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], PrivacyImpactAssessment.prototype, "stakeholderConsultation", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['draft', 'under_review', 'approved', 'rejected', 'requires_revision']),
    __metadata("design:type", String)
], PrivacyImpactAssessment.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PrivacyImpactAssessment.prototype, "reviewedBy", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], PrivacyImpactAssessment.prototype, "approvalDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], PrivacyImpactAssessment.prototype, "nextReviewDate", void 0);
class RiskAssessment {
}
exports.RiskAssessment = RiskAssessment;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RiskAssessment.prototype, "riskDescription", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['low', 'medium', 'high', 'very_high']),
    __metadata("design:type", String)
], RiskAssessment.prototype, "likelihood", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['low', 'medium', 'high', 'very_high']),
    __metadata("design:type", String)
], RiskAssessment.prototype, "impact", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['low', 'medium', 'high', 'very_high']),
    __metadata("design:type", String)
], RiskAssessment.prototype, "overallRisk", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], RiskAssessment.prototype, "mitigations", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['low', 'medium', 'high', 'very_high']),
    __metadata("design:type", String)
], RiskAssessment.prototype, "residualRisk", void 0);
/**
 * Data Breach Management
 */
class DataBreachRecord {
}
exports.DataBreachRecord = DataBreachRecord;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DataBreachRecord.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataBreachRecord.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataBreachRecord.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(BreachType),
    __metadata("design:type", String)
], DataBreachRecord.prototype, "breachType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(BreachSeverity),
    __metadata("design:type", String)
], DataBreachRecord.prototype, "severity", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(BreachStatus),
    __metadata("design:type", String)
], DataBreachRecord.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], DataBreachRecord.prototype, "discoveryDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], DataBreachRecord.prototype, "estimatedOccurrenceDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], DataBreachRecord.prototype, "containmentDate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], DataBreachRecord.prototype, "affectedRecordsCount", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DataBreachRecord.prototype, "affectedDataCategories", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DataBreachRecord.prototype, "affectedDataSubjects", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], DataBreachRecord.prototype, "rootCause", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], DataBreachRecord.prototype, "riskAssessment", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BreachNotification),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DataBreachRecord.prototype, "notifications", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DataBreachRecord.prototype, "immediateMitigation", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DataBreachRecord.prototype, "longTermPreventionMeasures", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataBreachRecord.prototype, "reportedBy", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataBreachRecord.prototype, "investigatedBy", void 0);
class BreachNotification {
}
exports.BreachNotification = BreachNotification;
__decorate([
    (0, class_validator_1.IsEnum)(['supervisory_authority', 'data_subjects', 'internal', 'third_party']),
    __metadata("design:type", String)
], BreachNotification.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], BreachNotification.prototype, "sentDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BreachNotification.prototype, "recipient", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BreachNotification.prototype, "method", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BreachNotification.prototype, "confirmationReference", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BreachNotification.prototype, "responseReceived", void 0);
/**
 * Cross-border data transfer documentation
 */
class CrossBorderTransfer {
}
exports.CrossBorderTransfer = CrossBorderTransfer;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CrossBorderTransfer.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CrossBorderTransfer.prototype, "transferName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CrossBorderTransfer.prototype, "dataExporter", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CrossBorderTransfer.prototype, "dataImporter", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CrossBorderTransfer.prototype, "destinationCountry", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CrossBorderTransfer.prototype, "dataCategories", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CrossBorderTransfer.prototype, "purposesOfTransfer", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['adequacy_decision', 'standard_contractual_clauses', 'binding_corporate_rules', 'consent', 'contract_necessity', 'derogation']),
    __metadata("design:type", String)
], CrossBorderTransfer.prototype, "legalMechanism", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CrossBorderTransfer.prototype, "adequacyDecisionReference", void 0);
__decorate([
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CrossBorderTransfer.prototype, "sccDocumentUrl", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], CrossBorderTransfer.prototype, "agreementDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], CrossBorderTransfer.prototype, "reviewDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CrossBorderTransfer.prototype, "riskAssessment", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CrossBorderTransfer.prototype, "isActive", void 0);
/**
 * Privacy compliance monitoring
 */
class PrivacyComplianceCheck {
}
exports.PrivacyComplianceCheck = PrivacyComplianceCheck;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PrivacyComplianceCheck.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PrivacyComplianceCheck.prototype, "checkType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PrivacyComplianceCheck.prototype, "systemComponent", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['passed', 'failed', 'warning', 'not_applicable']),
    __metadata("design:type", String)
], PrivacyComplianceCheck.prototype, "result", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], PrivacyComplianceCheck.prototype, "findings", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], PrivacyComplianceCheck.prototype, "recommendations", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], PrivacyComplianceCheck.prototype, "checkDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PrivacyComplianceCheck.prototype, "performedBy", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], PrivacyComplianceCheck.prototype, "nextCheckDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], PrivacyComplianceCheck.prototype, "metadata", void 0);
/**
 * Create/Update DTOs
 */
class CreateDataProcessingRecordDto {
}
exports.CreateDataProcessingRecordDto = CreateDataProcessingRecordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDataProcessingRecordDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDataProcessingRecordDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateDataProcessingRecordDto.prototype, "dataProcessorService", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateDataProcessingRecordDto.prototype, "purposesOfProcessing", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateDataProcessingRecordDto.prototype, "categoriesOfPersonalData", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ProcessingLegalBasis),
    __metadata("design:type", String)
], CreateDataProcessingRecordDto.prototype, "legalBasis", void 0);
class CreateBreachRecordDto {
}
exports.CreateBreachRecordDto = CreateBreachRecordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBreachRecordDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBreachRecordDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(BreachType),
    __metadata("design:type", String)
], CreateBreachRecordDto.prototype, "breachType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(BreachSeverity),
    __metadata("design:type", String)
], CreateBreachRecordDto.prototype, "severity", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], CreateBreachRecordDto.prototype, "discoveryDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBreachRecordDto.prototype, "reportedBy", void 0);
class UpdateRetentionStatusDto {
}
exports.UpdateRetentionStatusDto = UpdateRetentionStatusDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateRetentionStatusDto.prototype, "recordId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(DataRetentionStatus),
    __metadata("design:type", String)
], UpdateRetentionStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRetentionStatusDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRetentionStatusDto.prototype, "performedBy", void 0);
