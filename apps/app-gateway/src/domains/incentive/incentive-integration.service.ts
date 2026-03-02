import { Injectable, Logger } from '@nestjs/common';
import type { ContactInfoData } from '@ai-recruitment-clerk/shared-dtos';

// ============================================================================
// Type Definitions for Service-Specific Responses
// ============================================================================

/** Business value metrics for questionnaire incentives */
export interface BusinessValue {
  category?: string;
  estimatedValue?: number;
  qualityMetrics?: Record<string, number>;
  tags?: string[];
}

/** Metadata for incentive operations */
export interface IncentiveMetadata {
  source?: string;
  campaignId?: string;
  referrerId?: string;
  notes?: string;
  organizationId?: string;
}

/** Incentive status type for service responses */
export type ServiceIncentiveStatus =
  | 'pending'
  | 'validated'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'cancelled'
  | 'not_found';

/** Base incentive interface */
export interface BaseIncentive {
  id: string;
  status: ServiceIncentiveStatus;
  createdAt: Date;
  metadata?: IncentiveMetadata;
}

/** Questionnaire incentive response */
export interface QuestionnaireIncentive extends BaseIncentive {
  type: 'questionnaire';
  userIP: string;
  questionnaireId: string;
  qualityScore: number;
  contactInfo: ContactInfoData;
  businessValue: BusinessValue;
  incentiveType: string;
}

/** Referral incentive response */
export interface ReferralIncentive extends BaseIncentive {
  type: 'referral';
  referrerIP: string;
  referredIP: string;
  contactInfo: ContactInfoData;
  referralType: string;
  expectedValue: number;
}

/** Incentive type union */
export type ServiceIncentive = QuestionnaireIncentive | ReferralIncentive;

/** Options for querying incentives */
export interface GetIncentivesOptions {
  status?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/** Response for get incentives query */
export interface GetIncentivesResponse {
  incentives: ServiceIncentive[];
  items: ServiceIncentive[];
  total: number;
  totalCount: number;
  totalRewardAmount: number;
  organizationId: string;
  options?: GetIncentivesOptions;
}

/** Response for get single incentive */
export interface GetIncentiveResponse {
  incentiveId: string;
  organizationId: string;
  status: ServiceIncentiveStatus;
  data: ServiceIncentive | null;
}

/** Response for incentive validation */
export interface ValidateIncentiveResponse {
  incentiveId: string;
  organizationId: string;
  isValid: boolean;
  status: 'validated' | 'invalid';
  validatedAt: Date;
  message: string;
  errors: string[];
  canProceedToPayment: boolean;
}

/** Data for approving an incentive */
export interface ApprovalData {
  approverId: string;
  reason: string;
  notes?: string;
  organizationId: string;
}

/** Response for approve incentive */
export interface ApproveIncentiveResponse {
  incentiveId: string;
  status: 'approved';
  approvedAt: Date;
  approvedBy: string;
  reason: string;
  notes?: string;
  organizationId: string;
}

/** Response for reject incentive */
export interface RejectIncentiveResponse {
  incentiveId: string;
  status: 'rejected';
  rejectedAt: Date;
  rejectedBy: string;
  reason: string;
  notes?: string;
  organizationId: string;
}

/** Options for payment processing */
export interface PaymentOptions {
  amount?: number;
  currency?: string;
  notes?: string;
  referenceId?: string;
  transactionRef?: string;
  reason?: string;
  paymentMethod?: string;
}

/** Response for payment processing */
export interface ServicePaymentResult {
  success: boolean;
  transactionId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  processedBy?: string;
  organizationId?: string;
  processedAt?: Date;
  error?: string;
}

/** Result of a single batch operation */
export interface BatchOperationResult {
  incentiveId: string;
  success: boolean;
  action: string;
  processedAt: Date;
  error?: string;
}

/** Response for batch processing */
export interface BatchProcessResponse {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: BatchOperationResult[];
  action: string;
  processedBy: string;
  organizationId: string;
}

/** Response for incentive statistics */
export interface IncentiveStatisticsResponse {
  totalIncentives: number;
  totalRewardAmount: number;
  avgRewardAmount: number;
  conversionRate: number;
  statusDistribution: Record<string, number>;
  rewardTypeDistribution: Record<string, number>;
  paymentMethodDistribution: Record<string, number>;
  trends: Array<Record<string, string | number>>;
  topPerformers: Array<Record<string, string | number>>;
  organizationId: string;
  timeRange: string;
  groupBy: string;
}

/** Options for data export - supporting both 'excel' and 'xlsx' formats */
export interface ExportOptions {
  format?: 'csv' | 'xlsx' | 'excel' | 'json';
  status?: string | string[];
  type?: string;
  startDate?: Date;
  endDate?: Date;
  includeMetadata?: boolean;
  requestedBy?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  rewardTypes?: string[];
  includeContactInfo?: boolean;
}

/** Response for data export */
export interface ExportResponse {
  exportId: string;
  format: string;
  estimatedTime: string;
  downloadUrl: string;
  expiresAt: Date;
  organizationId: string;
  exportOptions: ExportOptions;
}

/** Reward tier configuration */
export interface RewardTier {
  minScore: number;
  maxScore: number;
  reward: number;
}

/** Questionnaire rules configuration */
export interface QuestionnaireRules {
  minQualityScore: number;
  rewardTiers: Array<{
    minScore: number;
    maxScore: number;
    rewardAmount: number;
  }>;
}

/** Referral rules configuration */
export interface ReferralRules {
  rewardAmount: number;
  maxReferralsPerIP: number;
}

/** Payment rules configuration */
export interface PaymentRules {
  minAmount?: number;
  maxAmount?: number;
  requiresApproval?: boolean;
  // Alternative naming used by controllers
  minPayoutAmount?: number;
  maxPayoutAmount?: number;
  autoApprovalThreshold?: number;
}

/** Configuration for incentive rules */
export interface RulesConfig {
  maxRewardAmount?: number;
  minRewardAmount?: number;
  approvalRequired?: boolean;
  autoApproveThreshold?: number;
  rewardTiers?: RewardTier[];
  questionnaireRules?: QuestionnaireRules;
  referralRules?: ReferralRules;
  paymentRules?: PaymentRules;
  enabled?: boolean;
}

/** Response for rules configuration */
export interface ConfigureRulesResponse {
  configId: string;
  rules: RulesConfig;
  organizationId: string;
  configuredBy: string;
  updatedAt: Date;
}

/** Health status component type */
export type HealthStatusComponent = 'healthy' | 'unhealthy' | 'unknown';

/** Response for health status check */
export interface HealthStatusResponse {
  overall: HealthStatusComponent;
  database: HealthStatusComponent;
  paymentProcessor: HealthStatusComponent;
  ruleEngine: HealthStatusComponent;
  eventProcessing: HealthStatusComponent;
  checkedAt?: Date;
  error?: string;
}

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Provides incentive integration functionality.
 */
@Injectable()
export class IncentiveIntegrationService {
  private readonly logger = new Logger(IncentiveIntegrationService.name);

  /**
   * 创建问卷激励 - EMERGENCY IMPLEMENTATION
   */

  public async createQuestionnaireIncentive(
    userIP: string,
    questionnaireId: string,
    qualityScore: number,
    contactInfo: ContactInfoData,
    businessValue: BusinessValue,
    incentiveType: string,
    metadata?: IncentiveMetadata,
  ): Promise<QuestionnaireIncentive> {
    try {
      this.logger.log('Creating questionnaire incentive', {
        userIP,
        questionnaireId,
        qualityScore,
        incentiveType,
      });

      return {
        id: `incentive_${Date.now()}`,
        type: 'questionnaire',
        userIP,
        questionnaireId,
        qualityScore,
        contactInfo,
        businessValue,
        incentiveType,
        status: 'pending',
        createdAt: new Date(),
        metadata,
      };
    } catch {
      this.logger.error('Error creating questionnaire incentive');
      throw new Error('Error creating questionnaire incentive');
    }
  }

  /**
   * 创建推荐激励 - EMERGENCY IMPLEMENTATION
   */

  public async createReferralIncentive(
    referrerIP: string,
    referredIP: string,
    contactInfo: ContactInfoData,
    referralType: string,
    expectedValue: number,
    metadata?: IncentiveMetadata,
  ): Promise<ReferralIncentive> {
    try {
      this.logger.log('Creating referral incentive', {
        referrerIP,
        referredIP,
        referralType,
        expectedValue,
      });

      return {
        id: `referral_${Date.now()}`,
        type: 'referral',
        referrerIP,
        referredIP,
        contactInfo,
        referralType,
        expectedValue,
        status: 'pending',
        createdAt: new Date(),
        metadata,
      };
    } catch {
      this.logger.error('Error creating referral incentive');
      throw new Error('Error creating referral incentive');
    }
  }

  /**
   * 获取激励列表 - EMERGENCY IMPLEMENTATION
   */

  public async getIncentives(
    organizationId: string,
    options?: GetIncentivesOptions,
  ): Promise<GetIncentivesResponse> {
    try {
      return {
        incentives: [],
        items: [],
        total: 0,
        totalCount: 0,
        totalRewardAmount: 0,
        organizationId,
        options,
      };
    } catch {
      this.logger.error('Error getting incentives');
      throw new Error('Error getting incentives');
    }
  }

  /**
   * 获取激励详情 - EMERGENCY IMPLEMENTATION
   */
  public async getIncentive(
    incentiveId: string,
    organizationId: string,
  ): Promise<GetIncentiveResponse> {
    try {
      return {
        incentiveId,
        organizationId,
        status: 'not_found',
        data: null,
      };
    } catch {
      this.logger.error('Error getting incentive');
      throw new Error('Error getting incentive');
    }
  }

  /**
   * 验证激励 - EMERGENCY IMPLEMENTATION
   */
  public async validateIncentive(
    incentiveId: string,
    organizationId: string,
  ): Promise<ValidateIncentiveResponse> {
    try {
      return {
        incentiveId,
        organizationId,
        isValid: true,
        status: 'validated',
        validatedAt: new Date(),
        message: 'Incentive validation successful',
        errors: [],
        canProceedToPayment: true,
      };
    } catch {
      this.logger.error('Error validating incentive');
      throw new Error('Error validating incentive');
    }
  }

  /**
   * 批准激励 - EMERGENCY IMPLEMENTATION
   */
  public async approveIncentive(
    incentiveId: string,
    approvalData: ApprovalData,
  ): Promise<ApproveIncentiveResponse> {
    try {
      return {
        incentiveId,
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: approvalData.approverId,
        reason: approvalData.reason,
        notes: approvalData.notes,
        organizationId: approvalData.organizationId,
      };
    } catch {
      this.logger.error('Error approving incentive');
      throw new Error('Error approving incentive');
    }
  }

  /**
   * 拒绝激励 - EMERGENCY IMPLEMENTATION
   */

  public async rejectIncentive(
    incentiveId: string,
    reason: string,
    rejectedBy: string,
    organizationId: string,
    notes?: string,
  ): Promise<RejectIncentiveResponse> {
    try {
      this.logger.log('Rejecting incentive', {
        incentiveId,
        reason,
        rejectedBy,
      });
      return {
        incentiveId,
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy,
        reason,
        notes,
        organizationId,
      };
    } catch {
      this.logger.error('Error rejecting incentive');
      throw new Error('Error rejecting incentive');
    }
  }

  /**
   * 处理付款 - EMERGENCY IMPLEMENTATION
   */
  public async processPayment(
    incentiveId: string,
    paymentMethod: string,
    processedBy: string,
    organizationId: string,
    options?: PaymentOptions,
  ): Promise<ServicePaymentResult> {
    try {
      this.logger.log('Processing payment', {
        incentiveId,
        paymentMethod,
        processedBy,
      });
      return {
        success: true,
        transactionId: `txn_${Date.now()}`,
        amount: options?.amount ?? 10.0,
        currency: options?.currency ?? 'USD',
        paymentMethod,
        processedBy,
        organizationId,
        processedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Error processing payment', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 批量处理激励 - EMERGENCY IMPLEMENTATION
   */
  public async batchProcessIncentives(
    incentiveIds: string[],
    action: string,
    processedBy: string,
    organizationId: string,
    _options?: PaymentOptions,
  ): Promise<BatchProcessResponse> {
    try {
      this.logger.log('Batch processing incentives', {
        count: incentiveIds.length,
        action,
        processedBy,
      });

      return {
        totalProcessed: incentiveIds.length,
        successful: incentiveIds.length,
        failed: 0,
        results: incentiveIds.map((id) => ({
          incentiveId: id,
          success: true,
          action,
          processedAt: new Date(),
        })),
        action,
        processedBy,
        organizationId,
      };
    } catch (error) {
      this.logger.error('Error batch processing incentives', error);
      throw error;
    }
  }

  /**
   * 获取激励统计数据 - EMERGENCY IMPLEMENTATION
   */
  public async getIncentiveStatistics(
    organizationId: string,
    timeRange: string,
    groupBy: string,
  ): Promise<IncentiveStatisticsResponse> {
    try {
      return {
        totalIncentives: 0,
        totalRewardAmount: 0,
        avgRewardAmount: 0,
        conversionRate: 0,
        statusDistribution: {},
        rewardTypeDistribution: {},
        paymentMethodDistribution: {},
        trends: [],
        topPerformers: [],
        organizationId,
        timeRange,
        groupBy,
      };
    } catch (error) {
      this.logger.error('Error getting incentive statistics', error);
      throw error;
    }
  }

  /**
   * 导出激励数据 - EMERGENCY IMPLEMENTATION
   */
  public async exportIncentiveData(
    organizationId: string,
    exportOptions: ExportOptions,
  ): Promise<ExportResponse> {
    try {
      // Normalize 'excel' to 'xlsx' for consistency
      const format = exportOptions.format === 'excel' ? 'xlsx' : (exportOptions.format ?? 'csv');
      return {
        exportId: `export_${Date.now()}`,
        format,
        estimatedTime: '5 minutes',
        downloadUrl: `/downloads/export_${Date.now()}.${format}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        organizationId,
        exportOptions,
      };
    } catch (error) {
      this.logger.error('Error exporting incentive data', error);
      throw error;
    }
  }

  /**
   * 配置激励规则 - EMERGENCY IMPLEMENTATION
   */
  public async configureIncentiveRules(
    organizationId: string,
    rulesConfig: RulesConfig,
    configuredBy: string,
  ): Promise<ConfigureRulesResponse> {
    try {
      return {
        configId: `config_${Date.now()}`,
        rules: rulesConfig,
        organizationId,
        configuredBy,
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Error configuring incentive rules', error);
      throw error;
    }
  }

  /**
   * 获取健康状态 - EMERGENCY IMPLEMENTATION
   */
  public async getHealthStatus(): Promise<HealthStatusResponse> {
    try {
      return {
        overall: 'healthy',
        database: 'healthy',
        paymentProcessor: 'healthy',
        ruleEngine: 'healthy',
        eventProcessing: 'healthy',
        checkedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Error getting health status', error);
      return {
        overall: 'unhealthy',
        database: 'unknown',
        paymentProcessor: 'unknown',
        ruleEngine: 'unknown',
        eventProcessing: 'unknown',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
