/**
 * 隐私合规服务重构示例
 * Privacy Compliance Service Refactoring Example
 * 
 * 原文件: apps/app-gateway/src/privacy/privacy-compliance.service.ts (964行)
 * 重构目标: 使用基础服务模式，拆分功能域，提高可测试性
 */

// ===========================================
// 1. 重构后的主服务 (使用基础模式)
// ===========================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { 
  BaseService, 
  ErrorHandler, 
  ValidationException,
  BusinessLogicException 
} from '@shared/common';

@Injectable()
export class PrivacyComplianceService extends BaseService {
  constructor(
    @InjectModel('UserProfile') private userProfileModel: Model<any>,
    private readonly consentManager: ConsentManagementService,
    private readonly rightsProcessor: DataSubjectRightsService,
    private readonly dataExporter: DataExportService,
    private readonly privacyValidator: PrivacyValidationService
  ) {
    super({
      serviceName: 'PrivacyComplianceService',
      enableMetrics: true,
      enableCaching: true,
      retryConfig: { maxRetries: 3, retryDelay: 1000 }
    });
  }

  /**
   * 捕获用户同意 - 使用基础服务模式
   */
  async captureConsent(captureConsentDto: CaptureConsentDto): Promise<UserConsentProfile> {
    return this.withTiming(async () => {
      try {
        // 验证输入
        this.privacyValidator.validateConsentRequest(captureConsentDto);

        // 委托给专门的同意管理服务
        const result = await this.consentManager.captureConsent(captureConsentDto);
        
        this.logSuccess('captureConsent', { userId: captureConsentDto.userId });
        return result;
        
      } catch (error) {
        this.handleError(error as Error, 'captureConsent');
        throw ErrorHandler.handleError(error as Error);
      }
    }, 'captureConsent');
  }

  /**
   * 撤销同意
   */
  async withdrawConsent(withdrawConsentDto: WithdrawConsentDto): Promise<UserConsentProfile> {
    return this.withRetry(async () => {
      return this.consentManager.withdrawConsent(withdrawConsentDto);
    }, 'withdrawConsent');
  }

  /**
   * 处理数据主体权利请求
   */
  async processRightsRequest(requestDto: ProcessRightsRequestDto): Promise<DataSubjectRightsRequest> {
    return this.withTiming(async () => {
      return this.rightsProcessor.processRequest(requestDto);
    }, 'processRightsRequest');
  }

  /**
   * 导出用户数据
   */
  async exportUserData(userId: string, format: DataExportFormat): Promise<DataExportPackage> {
    return this.withCache(
      `export:${userId}:${format}`,
      () => this.dataExporter.exportUserData(userId, format),
      300000 // 5分钟缓存
    );
  }
}

// ===========================================
// 2. 同意管理服务 (专门处理同意逻辑)
// ===========================================

@Injectable()
export class ConsentManagementService extends BaseService {
  constructor(
    @InjectModel('UserProfile') private userProfileModel: Model<any>,
    private readonly auditLogger: AuditLogger
  ) {
    super({ serviceName: 'ConsentManagementService' });
  }

  async captureConsent(dto: CaptureConsentDto): Promise<UserConsentProfile> {
    const session = await this.userProfileModel.db.startSession();
    
    try {
      session.startTransaction();

      // 查找或创建用户档案
      const userProfile = await this.findOrCreateUserProfile(dto.userId, session);

      // 更新同意记录
      const consentRecord = this.buildConsentRecord(dto);
      userProfile.consentRecords.push(consentRecord);

      // 更新同意状态
      this.updateConsentStatus(userProfile, dto);

      // 保存更改
      await userProfile.save({ session });
      
      // 记录审计日志
      await this.auditLogger.logConsentEvent({
        userId: dto.userId,
        action: 'CONSENT_CAPTURED',
        purposes: dto.purposes,
        timestamp: new Date()
      });

      await session.commitTransaction();
      
      return this.buildUserConsentProfile(userProfile);
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async withdrawConsent(dto: WithdrawConsentDto): Promise<UserConsentProfile> {
    const userProfile = await this.userProfileModel.findOne({ userId: dto.userId });
    
    if (!userProfile) {
      throw new BusinessLogicException(
        'USER_NOT_FOUND',
        `User profile not found for userId: ${dto.userId}`
      );
    }

    // 处理撤销逻辑
    this.processConsentWithdrawal(userProfile, dto);

    await userProfile.save();
    
    await this.auditLogger.logConsentEvent({
      userId: dto.userId,
      action: 'CONSENT_WITHDRAWN',
      purposes: dto.purposes,
      timestamp: new Date()
    });

    return this.buildUserConsentProfile(userProfile);
  }

  private async findOrCreateUserProfile(userId: string, session: any): Promise<any> {
    let userProfile = await this.userProfileModel.findOne({ userId }).session(session);
    
    if (!userProfile) {
      userProfile = new this.userProfileModel({
        userId,
        consentRecords: [],
        dataSubjectRights: [],
        privacySettings: this.getDefaultPrivacySettings(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return userProfile;
  }

  private buildConsentRecord(dto: CaptureConsentDto): ConsentRecord {
    return {
      id: this.generateId(),
      purposes: dto.purposes,
      consentStatus: ConsentStatus.GIVEN,
      consentMethod: dto.consentMethod || 'explicit',
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      timestamp: new Date(),
      expiryDate: dto.expiryDate,
      dataCategories: dto.dataCategories || [],
      legalBasis: dto.legalBasis || 'consent',
      processingPurposes: dto.processingPurposes || [],
      retentionPeriod: dto.retentionPeriod,
      thirdPartySharing: dto.thirdPartySharing || false
    };
  }

  private updateConsentStatus(userProfile: any, dto: CaptureConsentDto): void {
    // 更新整体同意状态逻辑
    const hasValidConsent = this.checkValidConsent(userProfile.consentRecords, dto.purposes);
    userProfile.hasValidConsent = hasValidConsent;
    userProfile.lastConsentUpdate = new Date();
  }

  private buildUserConsentProfile(userProfile: any): UserConsentProfile {
    return {
      userId: userProfile.userId,
      hasValidConsent: userProfile.hasValidConsent,
      consentRecords: userProfile.consentRecords,
      lastConsentUpdate: userProfile.lastConsentUpdate,
      privacySettings: userProfile.privacySettings
    };
  }

  private getDefaultPrivacySettings(): any {
    return {
      dataRetentionPeriod: 365, // days
      allowAnalytics: false,
      allowMarketing: false,
      allowThirdPartySharing: false,
      cookiePreferences: {
        essential: true,
        functional: false,
        analytics: false,
        marketing: false
      }
    };
  }

  private checkValidConsent(records: ConsentRecord[], purposes: ConsentPurpose[]): boolean {
    return purposes.every(purpose => {
      const relevantRecord = records
        .filter(record => record.purposes.includes(purpose))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
      return relevantRecord && 
             relevantRecord.consentStatus === ConsentStatus.GIVEN &&
             (!relevantRecord.expiryDate || relevantRecord.expiryDate > new Date());
    });
  }

  private processConsentWithdrawal(userProfile: any, dto: WithdrawConsentDto): void {
    // 创建撤销记录
    const withdrawalRecord: ConsentRecord = {
      id: this.generateId(),
      purposes: dto.purposes,
      consentStatus: ConsentStatus.WITHDRAWN,
      consentMethod: 'withdrawal',
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      timestamp: new Date(),
      dataCategories: [],
      legalBasis: 'withdrawal',
      processingPurposes: [],
      thirdPartySharing: false
    };

    userProfile.consentRecords.push(withdrawalRecord);
    
    // 更新整体状态
    userProfile.hasValidConsent = this.checkValidConsent(
      userProfile.consentRecords, 
      dto.purposes
    );
    userProfile.lastConsentUpdate = new Date();
  }

  private generateId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ===========================================
// 3. 数据主体权利处理服务
// ===========================================

@Injectable()
export class DataSubjectRightsService extends BaseService {
  constructor(
    @InjectModel('UserProfile') private userProfileModel: Model<any>,
    private readonly identityVerifier: IdentityVerificationService,
    private readonly dataProcessor: DataProcessingService
  ) {
    super({ serviceName: 'DataSubjectRightsService' });
  }

  async processRequest(dto: ProcessRightsRequestDto): Promise<DataSubjectRightsRequest> {
    return this.withTiming(async () => {
      // 验证身份
      const verificationResult = await this.identityVerifier.verifyIdentity(
        dto.userId, 
        dto.verificationData
      );

      if (!verificationResult.isVerified) {
        throw new BusinessLogicException(
          'IDENTITY_VERIFICATION_FAILED',
          'Identity verification failed for data subject rights request'
        );
      }

      // 根据请求类型处理
      switch (dto.requestType) {
        case DataSubjectRightType.ACCESS:
          return this.processAccessRequest(dto);
        case DataSubjectRightType.RECTIFICATION:
          return this.processRectificationRequest(dto);
        case DataSubjectRightType.ERASURE:
          return this.processErasureRequest(dto);
        case DataSubjectRightType.PORTABILITY:
          return this.processPortabilityRequest(dto);
        case DataSubjectRightType.RESTRICTION:
          return this.processRestrictionRequest(dto);
        default:
          throw new ValidationException(`Unsupported request type: ${dto.requestType}`);
      }
    }, 'processRequest');
  }

  private async processAccessRequest(dto: ProcessRightsRequestDto): Promise<DataSubjectRightsRequest> {
    // 收集用户数据
    const userData = await this.dataProcessor.collectUserData(dto.userId);
    
    // 创建请求记录
    const request = await this.createRightsRequest({
      ...dto,
      status: RequestStatus.COMPLETED,
      responseData: userData,
      completedAt: new Date()
    });

    return request;
  }

  private async processErasureRequest(dto: ProcessRightsRequestDto): Promise<DataSubjectRightsRequest> {
    // 检查是否可以删除（可能有法律义务保留某些数据）
    const canErase = await this.dataProcessor.checkErasureEligibility(dto.userId);
    
    if (!canErase.eligible) {
      const request = await this.createRightsRequest({
        ...dto,
        status: RequestStatus.REJECTED,
        rejectionReason: canErase.reason,
        completedAt: new Date()
      });
      return request;
    }

    // 执行数据删除
    await this.dataProcessor.eraseUserData(dto.userId, dto.dataCategories);
    
    const request = await this.createRightsRequest({
      ...dto,
      status: RequestStatus.COMPLETED,
      completedAt: new Date()
    });

    return request;
  }

  private async processRectificationRequest(dto: ProcessRightsRequestDto): Promise<DataSubjectRightsRequest> {
    // 更新用户数据
    await this.dataProcessor.updateUserData(dto.userId, dto.rectificationData);
    
    const request = await this.createRightsRequest({
      ...dto,
      status: RequestStatus.COMPLETED,
      completedAt: new Date()
    });

    return request;
  }

  private async processPortabilityRequest(dto: ProcessRightsRequestDto): Promise<DataSubjectRightsRequest> {
    // 导出可移植数据
    const portableData = await this.dataProcessor.exportPortableData(dto.userId);
    
    const request = await this.createRightsRequest({
      ...dto,
      status: RequestStatus.COMPLETED,
      responseData: portableData,
      completedAt: new Date()
    });

    return request;
  }

  private async processRestrictionRequest(dto: ProcessRightsRequestDto): Promise<DataSubjectRightsRequest> {
    // 限制处理
    await this.dataProcessor.restrictProcessing(dto.userId, dto.dataCategories);
    
    const request = await this.createRightsRequest({
      ...dto,
      status: RequestStatus.COMPLETED,
      completedAt: new Date()
    });

    return request;
  }

  private async createRightsRequest(data: any): Promise<DataSubjectRightsRequest> {
    // 创建数据主体权利请求记录
    const userProfile = await this.userProfileModel.findOne({ userId: data.userId });
    
    const request: DataSubjectRightsRequest = {
      id: this.generateRequestId(),
      userId: data.userId,
      requestType: data.requestType,
      status: data.status,
      submittedAt: new Date(),
      completedAt: data.completedAt,
      requestData: data.requestData,
      responseData: data.responseData,
      verificationStatus: IdentityVerificationStatus.VERIFIED,
      rejectionReason: data.rejectionReason
    };

    userProfile.dataSubjectRights.push(request);
    await userProfile.save();

    return request;
  }

  private generateRequestId(): string {
    return `dsr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ===========================================
// 4. 隐私验证服务
// ===========================================

@Injectable()
export class PrivacyValidationService {
  private readonly businessRules = new PrivacyBusinessRules();

  validateConsentRequest(dto: CaptureConsentDto): void {
    // 基本验证
    if (!dto.userId) {
      throw new ValidationException('User ID is required');
    }

    if (!dto.purposes || dto.purposes.length === 0) {
      throw new ValidationException('Consent purposes are required');
    }

    // 业务规则验证
    const validation = this.businessRules.validateConsentCapture(dto);
    if (!validation.isValid) {
      throw new ValidationException('Consent validation failed', validation.errors);
    }
  }

  validateRightsRequest(dto: ProcessRightsRequestDto): void {
    if (!dto.userId) {
      throw new ValidationException('User ID is required');
    }

    if (!dto.requestType) {
      throw new ValidationException('Request type is required');
    }

    // 验证请求类型特定的数据
    this.validateRequestTypeSpecificData(dto);
  }

  private validateRequestTypeSpecificData(dto: ProcessRightsRequestDto): void {
    switch (dto.requestType) {
      case DataSubjectRightType.RECTIFICATION:
        if (!dto.rectificationData) {
          throw new ValidationException('Rectification data is required for rectification requests');
        }
        break;
      case DataSubjectRightType.ERASURE:
        if (!dto.dataCategories || dto.dataCategories.length === 0) {
          throw new ValidationException('Data categories are required for erasure requests');
        }
        break;
      // 其他验证...
    }
  }
}

// ===========================================
// 5. 业务规则类
// ===========================================

export class PrivacyBusinessRules {
  validateConsentCapture(dto: CaptureConsentDto): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查同意的有效性
    if (dto.purposes.includes(ConsentPurpose.MARKETING) && !dto.explicitConsent) {
      errors.push('Marketing consent requires explicit consent');
    }

    // 检查数据类别和处理目的的匹配
    if (dto.dataCategories && dto.processingPurposes) {
      const isValid = this.validateDataCategoryPurposeMatch(
        dto.dataCategories, 
        dto.processingPurposes
      );
      if (!isValid) {
        errors.push('Data categories and processing purposes mismatch');
      }
    }

    // 检查保留期限
    if (dto.retentionPeriod && dto.retentionPeriod > 2555) { // 7 years max
      errors.push('Retention period exceeds maximum allowed duration');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateDataCategoryPurposeMatch(
    categories: DataCategory[], 
    purposes: string[]
  ): boolean {
    // 实现数据类别和处理目的匹配逻辑
    return true; // 简化实现
  }
}

// ===========================================
// 重构总结
// ===========================================

/**
 * 重构成果:
 * 
 * 1. 原始文件: 964行 → 拆分为5个专注服务
 *    - PrivacyComplianceService: ~100行 (主协调器)
 *    - ConsentManagementService: ~200行 (同意管理)
 *    - DataSubjectRightsService: ~150行 (权利处理)
 *    - PrivacyValidationService: ~80行 (验证)
 *    - PrivacyBusinessRules: ~60行 (业务规则)
 * 
 * 2. 使用基础模式:
 *    - BaseService提供通用功能
 *    - 统一错误处理
 *    - 性能监控和重试机制
 *    - 缓存支持
 * 
 * 3. 可测试性提升:
 *    - 单一职责的小类
 *    - 依赖注入
 *    - 业务逻辑分离
 * 
 * 4. 可维护性改善:
 *    - 清晰的关注点分离
 *    - 可复用的验证逻辑
 *    - 标准化的错误处理
 */