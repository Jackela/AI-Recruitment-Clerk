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
exports.UpdateRetentionStatusDto = exports.CreateBreachRecordDto = exports.CreateDataProcessingRecordDto = exports.DataBreachRecord = exports.DataRetentionPolicy = exports.DataProcessingRecord = exports.BreachStatus = exports.BreachType = exports.BreachSeverity = exports.DataRetentionStatus = exports.ProcessingLegalBasis = void 0;
const class_validator_1 = require("class-validator");
/**
 * 简化的隐私基础设施DTO
 * 专为Railway部署优化
 */
var ProcessingLegalBasis;
(function (ProcessingLegalBasis) {
    ProcessingLegalBasis["CONSENT"] = "consent";
    ProcessingLegalBasis["CONTRACT"] = "contract";
    ProcessingLegalBasis["LEGAL_OBLIGATION"] = "legal_obligation";
    ProcessingLegalBasis["VITAL_INTERESTS"] = "vital_interests";
    ProcessingLegalBasis["PUBLIC_TASK"] = "public_task";
    ProcessingLegalBasis["LEGITIMATE_INTERESTS"] = "legitimate_interests";
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
    BreachType["AVAILABILITY"] = "availability";
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
 * 数据处理记录 (简化版)
 */
class DataProcessingRecord {
}
exports.DataProcessingRecord = DataProcessingRecord;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "dataController", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
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
    (0, class_validator_1.IsEnum)(ProcessingLegalBasis),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "legalBasis", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataProcessingRecord.prototype, "retentionPeriod", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], DataProcessingRecord.prototype, "involvesSpecialCategories", void 0);
/**
 * 数据保留政策
 */
class DataRetentionPolicy {
}
exports.DataRetentionPolicy = DataRetentionPolicy;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DataRetentionPolicy.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DataRetentionPolicy.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DataRetentionPolicy.prototype, "dataCategory", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DataRetentionPolicy.prototype, "retentionPeriodDays", void 0);
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
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], DataRetentionPolicy.prototype, "isActive", void 0);
/**
 * 数据泄露记录
 */
class DataBreachRecord {
}
exports.DataBreachRecord = DataBreachRecord;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DataBreachRecord.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DataBreachRecord.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
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
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], DataBreachRecord.prototype, "estimatedOccurrenceDate", void 0);
__decorate([
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
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataBreachRecord.prototype, "reportedBy", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], DataBreachRecord.prototype, "investigatedBy", void 0);
/**
 * 创建/更新 DTOs
 */
class CreateDataProcessingRecordDto {
}
exports.CreateDataProcessingRecordDto = CreateDataProcessingRecordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDataProcessingRecordDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDataProcessingRecordDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
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
    __metadata("design:type", String)
], CreateBreachRecordDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
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
    (0, class_validator_1.IsString)(),
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
