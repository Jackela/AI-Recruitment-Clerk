import type {
  IncentiveStatus,
  PaymentMethod,
} from '../aggregates/incentive.aggregate.js';
import type { ContactInfo } from '../value-objects/index.js';
import type {
  IAuditLogger,
  IDomainEventBus,
  IIncentiveRepository,
  IPaymentGateway,
  BatchPaymentResult,
  IncentiveApprovalResult,
  IncentiveCreationResult,
  IncentiveRejectionResult,
  IncentiveStatsResult,
  IncentiveValidationResult,
  PaymentProcessingResult,
  PendingIncentivesResult,
} from '../../application/dtos/incentive.dto.js';
import { IncentiveCreationService } from './incentive/incentive-creation.service.js';
import { IncentivePaymentService } from './incentive/incentive-payment.service.js';
import { IncentiveReviewService } from './incentive/incentive-review.service.js';
import { IncentiveStatisticsService } from './incentive/incentive-statistics.service.js';
import { IncentiveValidationService } from './incentive/incentive-validation.service.js';

/**
 * Provides incentive domain functionality.
 */
export class IncentiveDomainService {
  private readonly creationService: IncentiveCreationService;
  private readonly validationService: IncentiveValidationService;
  private readonly reviewService: IncentiveReviewService;
  private readonly paymentService: IncentivePaymentService;
  private readonly statisticsService: IncentiveStatisticsService;

  /**
   * Initializes a new instance of the Incentive Domain Service.
   * @param repository - The repository.
   * @param eventBus - The event bus.
   * @param auditLogger - The audit logger.
   * @param paymentGateway - The payment gateway.
   */
  constructor(
    private readonly repository: IIncentiveRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly auditLogger: IAuditLogger,
    private readonly paymentGateway: IPaymentGateway,
  ) {
    this.creationService = new IncentiveCreationService(
      this.repository,
      this.eventBus,
      this.auditLogger,
    );
    this.validationService = new IncentiveValidationService(
      this.repository,
      this.eventBus,
      this.auditLogger,
    );
    this.reviewService = new IncentiveReviewService(
      this.repository,
      this.eventBus,
      this.auditLogger,
    );
    this.paymentService = new IncentivePaymentService(
      this.repository,
      this.eventBus,
      this.auditLogger,
      this.paymentGateway,
    );
    this.statisticsService = new IncentiveStatisticsService(
      this.repository,
      this.auditLogger,
    );
  }

  /**
   * 创建问卷完成激励
   */
  public async createQuestionnaireIncentive(
    ip: string,
    questionnaireId: string,
    qualityScore: number,
    contactInfo: ContactInfo,
  ): Promise<IncentiveCreationResult> {
    return this.creationService.createQuestionnaireIncentive(
      ip,
      questionnaireId,
      qualityScore,
      contactInfo,
    );
  }

  /**
   * 创建推荐激励
   */
  public async createReferralIncentive(
    referrerIP: string,
    referredIP: string,
    contactInfo: ContactInfo,
  ): Promise<IncentiveCreationResult> {
    return this.creationService.createReferralIncentive(
      referrerIP,
      referredIP,
      contactInfo,
    );
  }

  /**
   * 验证激励资格
   */
  public async validateIncentive(
    incentiveId: string,
  ): Promise<IncentiveValidationResult> {
    return this.validationService.validateIncentive(incentiveId);
  }

  /**
   * 批准激励处理
   */
  public async approveIncentive(
    incentiveId: string,
    reason: string,
  ): Promise<IncentiveApprovalResult> {
    return this.reviewService.approveIncentive(incentiveId, reason);
  }

  /**
   * 拒绝激励
   */
  public async rejectIncentive(
    incentiveId: string,
    reason: string,
  ): Promise<IncentiveRejectionResult> {
    return this.reviewService.rejectIncentive(incentiveId, reason);
  }

  /**
   * 执行单笔支付
   */
  public async processPayment(
    incentiveId: string,
    paymentMethod: PaymentMethod,
    contactInfo?: ContactInfo,
  ): Promise<PaymentProcessingResult> {
    return this.paymentService.processPayment(
      incentiveId,
      paymentMethod,
      contactInfo,
    );
  }

  /**
   * 批量支付处理
   */
  public async processBatchPayment(
    incentiveIds: string[],
    paymentMethod: PaymentMethod,
  ): Promise<BatchPaymentResult> {
    return this.paymentService.processBatchPayment(incentiveIds, paymentMethod);
  }

  /**
   * 获取激励统计信息
   */
  public async getIncentiveStatistics(
    ip?: string,
    timeRange?: { startDate: Date; endDate: Date },
  ): Promise<IncentiveStatsResult> {
    return this.statisticsService.getIncentiveStatistics(ip, timeRange);
  }

  /**
   * 获取待处理激励列表（按优先级排序）
   */
  public async getPendingIncentives(
    status?: IncentiveStatus,
    limit = 50,
  ): Promise<PendingIncentivesResult> {
    return this.statisticsService.getPendingIncentives(status, limit);
  }
}
