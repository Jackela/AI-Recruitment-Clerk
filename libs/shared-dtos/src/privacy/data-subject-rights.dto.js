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
exports.AutomatedRightsRule = exports.RightsFulfillmentMetrics = exports.BulkRightsProcessingDto = exports.RequestActivityLog = exports.RightsRequestStatusDto = exports.DataCategoryExport = exports.DataExportPackage = exports.ProcessRightsRequestDto = exports.IdentityVerificationDto = exports.CreateRightsRequestDto = exports.ProcessingRestrictionRequest = exports.ProcessingObjectionRequest = exports.DataPortabilityRequest = exports.DataErasureRequest = exports.FieldCorrectionDto = exports.DataRectificationRequest = exports.DataAccessRequest = exports.DataSubjectRightsRequest = exports.DataExportFormat = exports.IdentityVerificationStatus = exports.RequestStatus = exports.DataSubjectRightType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
/**
 * GDPR Data Subject Rights DTOs
 * Implements Articles 15-21 of GDPR for automated rights fulfillment
 */
var DataSubjectRightType;
(function (DataSubjectRightType) {
    DataSubjectRightType["ACCESS"] = "access";
    DataSubjectRightType["RECTIFICATION"] = "rectification";
    DataSubjectRightType["ERASURE"] = "erasure";
    DataSubjectRightType["PORTABILITY"] = "portability";
    DataSubjectRightType["OBJECTION"] = "objection";
    DataSubjectRightType["RESTRICT_PROCESSING"] = "restrict_processing"; // Article 18 - Right to restrict processing
})(DataSubjectRightType || (exports.DataSubjectRightType = DataSubjectRightType = {}));
var RequestStatus;
(function (RequestStatus) {
    RequestStatus["PENDING"] = "pending";
    RequestStatus["IN_PROGRESS"] = "in_progress";
    RequestStatus["COMPLETED"] = "completed";
    RequestStatus["REJECTED"] = "rejected";
    RequestStatus["PARTIALLY_COMPLETED"] = "partially_completed";
    RequestStatus["CANCELLED"] = "cancelled";
})(RequestStatus || (exports.RequestStatus = RequestStatus = {}));
var IdentityVerificationStatus;
(function (IdentityVerificationStatus) {
    IdentityVerificationStatus["PENDING"] = "pending";
    IdentityVerificationStatus["VERIFIED"] = "verified";
    IdentityVerificationStatus["FAILED"] = "failed";
    IdentityVerificationStatus["NOT_REQUIRED"] = "not_required";
})(IdentityVerificationStatus || (exports.IdentityVerificationStatus = IdentityVerificationStatus = {}));
var DataExportFormat;
(function (DataExportFormat) {
    DataExportFormat["JSON"] = "json";
    DataExportFormat["CSV"] = "csv";
    DataExportFormat["PDF"] = "pdf";
    DataExportFormat["XML"] = "xml";
})(DataExportFormat || (exports.DataExportFormat = DataExportFormat = {}));
/**
 * Base data subject rights request
 */
class DataSubjectRightsRequest {
}
exports.DataSubjectRightsRequest = DataSubjectRightsRequest;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DataSubjectRightsRequest.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataSubjectRightsRequest.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(DataSubjectRightType),
    __metadata("design:type", String)
], DataSubjectRightsRequest.prototype, "requestType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(RequestStatus),
    __metadata("design:type", String)
], DataSubjectRightsRequest.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(IdentityVerificationStatus),
    __metadata("design:type", String)
], DataSubjectRightsRequest.prototype, "identityVerificationStatus", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataSubjectRightsRequest.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], DataSubjectRightsRequest.prototype, "requestDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], DataSubjectRightsRequest.prototype, "completionDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], DataSubjectRightsRequest.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataSubjectRightsRequest.prototype, "processorNotes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], DataSubjectRightsRequest.prototype, "metadata", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataSubjectRightsRequest.prototype, "ipAddress", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataSubjectRightsRequest.prototype, "userAgent", void 0);
/**
 * Data access request (Article 15)
 */
class DataAccessRequest extends DataSubjectRightsRequest {
}
exports.DataAccessRequest = DataAccessRequest;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DataAccessRequest.prototype, "specificDataCategories", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(DataExportFormat),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataAccessRequest.prototype, "preferredFormat", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], DataAccessRequest.prototype, "includeThirdPartyData", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], DataAccessRequest.prototype, "includeProcessingHistory", void 0);
/**
 * Data rectification request (Article 16)
 */
class DataRectificationRequest extends DataSubjectRightsRequest {
}
exports.DataRectificationRequest = DataRectificationRequest;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => FieldCorrectionDto),
    __metadata("design:type", Array)
], DataRectificationRequest.prototype, "corrections", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataRectificationRequest.prototype, "justification", void 0);
class FieldCorrectionDto {
}
exports.FieldCorrectionDto = FieldCorrectionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], FieldCorrectionDto.prototype, "fieldPath", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], FieldCorrectionDto.prototype, "currentValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], FieldCorrectionDto.prototype, "newValue", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FieldCorrectionDto.prototype, "reason", void 0);
/**
 * Data erasure request (Article 17 - Right to be forgotten)
 */
class DataErasureRequest extends DataSubjectRightsRequest {
}
exports.DataErasureRequest = DataErasureRequest;
__decorate([
    (0, class_validator_1.IsEnum)(['withdrawal_of_consent', 'no_longer_necessary', 'unlawful_processing', 'legal_obligation', 'public_interest']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataErasureRequest.prototype, "erasureGround", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DataErasureRequest.prototype, "specificDataCategories", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], DataErasureRequest.prototype, "retainForLegalReasons", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataErasureRequest.prototype, "legalRetentionReason", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], DataErasureRequest.prototype, "anonymizeInsteadOfDelete", void 0);
/**
 * Data portability request (Article 20)
 */
class DataPortabilityRequest extends DataSubjectRightsRequest {
}
exports.DataPortabilityRequest = DataPortabilityRequest;
__decorate([
    (0, class_validator_1.IsEnum)(DataExportFormat),
    __metadata("design:type", String)
], DataPortabilityRequest.prototype, "format", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DataPortabilityRequest.prototype, "specificDataCategories", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataPortabilityRequest.prototype, "targetController", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], DataPortabilityRequest.prototype, "machineReadableFormat", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataPortabilityRequest.prototype, "downloadUrl", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], DataPortabilityRequest.prototype, "downloadExpiry", void 0);
/**
 * Processing objection request (Article 21)
 */
class ProcessingObjectionRequest extends DataSubjectRightsRequest {
}
exports.ProcessingObjectionRequest = ProcessingObjectionRequest;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ProcessingObjectionRequest.prototype, "processingPurposes", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ProcessingObjectionRequest.prototype, "objectionReason", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ProcessingObjectionRequest.prototype, "objectToDirectMarketing", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ProcessingObjectionRequest.prototype, "objectToAutomatedDecisionMaking", void 0);
/**
 * Processing restriction request (Article 18)
 */
class ProcessingRestrictionRequest extends DataSubjectRightsRequest {
}
exports.ProcessingRestrictionRequest = ProcessingRestrictionRequest;
__decorate([
    (0, class_validator_1.IsEnum)(['accuracy_contested', 'processing_unlawful', 'no_longer_needed', 'objection_pending']),
    __metadata("design:type", String)
], ProcessingRestrictionRequest.prototype, "restrictionGround", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], ProcessingRestrictionRequest.prototype, "specificProcessingActivities", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], ProcessingRestrictionRequest.prototype, "restrictionEndDate", void 0);
/**
 * Create rights request DTO
 */
class CreateRightsRequestDto {
}
exports.CreateRightsRequestDto = CreateRightsRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateRightsRequestDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(DataSubjectRightType),
    __metadata("design:type", String)
], CreateRightsRequestDto.prototype, "requestType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRightsRequestDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateRightsRequestDto.prototype, "requestDetails", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRightsRequestDto.prototype, "ipAddress", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRightsRequestDto.prototype, "userAgent", void 0);
/**
 * Identity verification for rights requests
 */
class IdentityVerificationDto {
}
exports.IdentityVerificationDto = IdentityVerificationDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], IdentityVerificationDto.prototype, "requestId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['email_verification', 'phone_verification', 'document_upload', 'security_questions']),
    __metadata("design:type", String)
], IdentityVerificationDto.prototype, "verificationType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], IdentityVerificationDto.prototype, "verificationData", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], IdentityVerificationDto.prototype, "verificationCode", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], IdentityVerificationDto.prototype, "verificationExpiry", void 0);
/**
 * Rights request processing update
 */
class ProcessRightsRequestDto {
}
exports.ProcessRightsRequestDto = ProcessRightsRequestDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ProcessRightsRequestDto.prototype, "requestId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(RequestStatus),
    __metadata("design:type", String)
], ProcessRightsRequestDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ProcessRightsRequestDto.prototype, "processorNotes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ProcessRightsRequestDto.prototype, "completionData", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ProcessRightsRequestDto.prototype, "rejectionReason", void 0);
/**
 * Data export package structure
 */
class DataExportPackage {
}
exports.DataExportPackage = DataExportPackage;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], DataExportPackage.prototype, "requestId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataExportPackage.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(DataExportFormat),
    __metadata("design:type", String)
], DataExportPackage.prototype, "format", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => DataCategoryExport),
    __metadata("design:type", Array)
], DataExportPackage.prototype, "dataCategories", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], DataExportPackage.prototype, "metadata", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataExportPackage.prototype, "downloadUrl", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], DataExportPackage.prototype, "urlExpiry", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], DataExportPackage.prototype, "fileSizeBytes", void 0);
class DataCategoryExport {
}
exports.DataCategoryExport = DataCategoryExport;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataCategoryExport.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DataCategoryExport.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], DataCategoryExport.prototype, "data", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], DataCategoryExport.prototype, "sources", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataCategoryExport.prototype, "legalBasis", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataCategoryExport.prototype, "retentionPeriod", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], DataCategoryExport.prototype, "collectionDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], DataCategoryExport.prototype, "lastModified", void 0);
/**
 * Rights request status query
 */
class RightsRequestStatusDto {
}
exports.RightsRequestStatusDto = RightsRequestStatusDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RightsRequestStatusDto.prototype, "requestId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(DataSubjectRightType),
    __metadata("design:type", String)
], RightsRequestStatusDto.prototype, "requestType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(RequestStatus),
    __metadata("design:type", String)
], RightsRequestStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(IdentityVerificationStatus),
    __metadata("design:type", String)
], RightsRequestStatusDto.prototype, "identityVerificationStatus", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], RightsRequestStatusDto.prototype, "requestDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], RightsRequestStatusDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], RightsRequestStatusDto.prototype, "completionDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RightsRequestStatusDto.prototype, "statusMessage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], RightsRequestStatusDto.prototype, "completionData", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => RequestActivityLog),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], RightsRequestStatusDto.prototype, "activityLog", void 0);
class RequestActivityLog {
}
exports.RequestActivityLog = RequestActivityLog;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], RequestActivityLog.prototype, "timestamp", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RequestActivityLog.prototype, "action", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RequestActivityLog.prototype, "performedBy", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RequestActivityLog.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(RequestStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RequestActivityLog.prototype, "statusChange", void 0);
/**
 * Bulk rights processing for admin operations
 */
class BulkRightsProcessingDto {
}
exports.BulkRightsProcessingDto = BulkRightsProcessingDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)(4, { each: true }),
    __metadata("design:type", Array)
], BulkRightsProcessingDto.prototype, "requestIds", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(RequestStatus),
    __metadata("design:type", String)
], BulkRightsProcessingDto.prototype, "action", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BulkRightsProcessingDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BulkRightsProcessingDto.prototype, "performedBy", void 0);
/**
 * Rights fulfillment metrics
 */
class RightsFulfillmentMetrics {
}
exports.RightsFulfillmentMetrics = RightsFulfillmentMetrics;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], RightsFulfillmentMetrics.prototype, "periodStart", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], RightsFulfillmentMetrics.prototype, "periodEnd", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], RightsFulfillmentMetrics.prototype, "requestCounts", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], RightsFulfillmentMetrics.prototype, "processingTimes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], RightsFulfillmentMetrics.prototype, "identityVerification", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], RightsFulfillmentMetrics.prototype, "dataExports", void 0);
/**
 * Automated rights processing rules
 */
class AutomatedRightsRule {
}
exports.AutomatedRightsRule = AutomatedRightsRule;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AutomatedRightsRule.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(DataSubjectRightType),
    __metadata("design:type", String)
], AutomatedRightsRule.prototype, "requestType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AutomatedRightsRule.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AutomatedRightsRule.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], AutomatedRightsRule.prototype, "conditions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], AutomatedRightsRule.prototype, "actions", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AutomatedRightsRule.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], AutomatedRightsRule.prototype, "createdAt", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], AutomatedRightsRule.prototype, "lastModified", void 0);
