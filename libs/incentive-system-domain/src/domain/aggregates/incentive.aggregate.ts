import type { DomainEvent } from '../domain-events/base/domain-event.js';

import type {
  ContactInfo} from '../value-objects/index.js';
import {
  IncentiveId,
  IncentiveRecipient,
  IncentiveReward,
  IncentiveTrigger,
  IncentiveValidationResult,
  PaymentResult,
  IncentiveSummary,
} from '../value-objects/index.js';

import {
  IncentiveCreatedEvent,
  IncentiveValidatedEvent,
  IncentiveValidationFailedEvent,
  IncentiveApprovedEvent,
  IncentiveRejectedEvent,
  IncentivePaidEvent,
  PaymentFailedEvent,
} from '../domain-events/index.js';
// Incentive聚合根 - 管理红包激励系统的核心业务逻辑
/**
 * Represents the incentive.
 */
export class Incentive {
  private uncommittedEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: IncentiveId,
    private readonly recipient: IncentiveRecipient,
    private readonly reward: IncentiveReward,
    private readonly trigger: IncentiveTrigger,
    private status: IncentiveStatus,
    private readonly createdAt: Date,
    private processedAt?: Date,
    private paidAt?: Date,
  ) {}

  // 工厂方法 - 创建问卷完成激励
  /**
   * Creates questionnaire incentive.
   * @param ip - The ip.
   * @param questionnaireId - The questionnaire id.
   * @param qualityScore - The quality score.
   * @param contactInfo - The contact info.
   * @returns The Incentive.
   */
  public static createQuestionnaireIncentive(
    ip: string,
    questionnaireId: string,
    qualityScore: number,
    contactInfo: ContactInfo,
  ): Incentive {
    const incentiveId = IncentiveId.generate();
    const recipient = IncentiveRecipient.create(ip, contactInfo);
    const trigger = IncentiveTrigger.fromQuestionnaire(
      questionnaireId,
      qualityScore,
    );
    const reward = IncentiveReward.calculateForQuestionnaire(qualityScore);

    const incentive = new Incentive(
      incentiveId,
      recipient,
      reward,
      trigger,
      IncentiveStatus.PENDING_VALIDATION,
      new Date(),
    );

    incentive.addEvent(
      new IncentiveCreatedEvent(
        incentiveId.getValue(),
        ip,
        reward.getAmount(),
        reward.getCurrency(),
        trigger.getTriggerType(),
        new Date(),
      ),
    );

    // 如果质量足够高，自动进入处理状态
    if (qualityScore >= 70) {
      incentive.approveForProcessing('High quality questionnaire completion');
    }

    return incentive;
  }

  // 工厂方法 - 创建推荐激励
  /**
   * Creates referral incentive.
   * @param referrerIP - The referrer ip.
   * @param referredIP - The referred ip.
   * @param contactInfo - The contact info.
   * @returns The Incentive.
   */
  public static createReferralIncentive(
    referrerIP: string,
    referredIP: string,
    contactInfo: ContactInfo,
  ): Incentive {
    const incentiveId = IncentiveId.generate();
    const recipient = IncentiveRecipient.create(referrerIP, contactInfo);
    const trigger = IncentiveTrigger.fromReferral(referredIP);
    const reward = IncentiveReward.createReferralReward();

    const incentive = new Incentive(
      incentiveId,
      recipient,
      reward,
      trigger,
      IncentiveStatus.PENDING_VALIDATION,
      new Date(),
    );

    incentive.addEvent(
      new IncentiveCreatedEvent(
        incentiveId.getValue(),
        referrerIP,
        reward.getAmount(),
        reward.getCurrency(),
        trigger.getTriggerType(),
        new Date(),
      ),
    );

    return incentive;
  }

  // 工厂方法 - 从持久化数据恢复
  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The Incentive.
   */
  public static restore(data: IncentiveData): Incentive {
    return new Incentive(
      new IncentiveId({ value: data.id }),
      IncentiveRecipient.restore(data.recipient),
      IncentiveReward.restore(data.reward),
      IncentiveTrigger.restore(data.trigger),
      data.status,
      new Date(data.createdAt),
      data.processedAt ? new Date(data.processedAt) : undefined,
      data.paidAt ? new Date(data.paidAt) : undefined,
    );
  }

  // 核心业务方法 - 验证激励资格
  /**
   * Validates eligibility.
   * @returns The IncentiveValidationResult.
   */
  public validateEligibility(): IncentiveValidationResult {
    const validationErrors: string[] = [];

    // 验证触发条件
    if (!this.trigger.isValid()) {
      validationErrors.push(...this.trigger.getValidationErrors());
    }

    // 验证接收者
    if (!this.recipient.isValid()) {
      validationErrors.push(...this.recipient.getValidationErrors());
    }

    // 验证奖励配置
    if (!this.reward.isValid()) {
      validationErrors.push(...this.reward.getValidationErrors());
    }

    // 验证状态一致性
    if (this.status === IncentiveStatus.PAID && !this.paidAt) {
      validationErrors.push('Paid incentive must have payment timestamp');
    }

    const isValid = validationErrors.length === 0;
    const result = new IncentiveValidationResult(isValid, validationErrors);

    if (isValid) {
      this.addEvent(
        new IncentiveValidatedEvent(
          this.id.getValue(),
          this.recipient.getIP(),
          this.reward.getAmount(),
          new Date(),
        ),
      );
    } else {
      this.addEvent(
        new IncentiveValidationFailedEvent(
          this.id.getValue(),
          this.recipient.getIP(),
          validationErrors,
          new Date(),
        ),
      );
    }

    return result;
  }

  // 批准处理
  /**
   * Performs the approve for processing operation.
   * @param reason - The reason.
   */
  public approveForProcessing(reason: string): void {
    if (this.status !== IncentiveStatus.PENDING_VALIDATION) {
      throw new Error(`Cannot approve incentive in ${this.status} status`);
    }

    this.status = IncentiveStatus.APPROVED;
    this.processedAt = new Date();

    this.addEvent(
      new IncentiveApprovedEvent(
        this.id.getValue(),
        this.recipient.getIP(),
        this.reward.getAmount(),
        reason,
        new Date(),
      ),
    );
  }

  // 拒绝激励
  /**
   * Performs the reject operation.
   * @param reason - The reason.
   */
  public reject(reason: string): void {
    if (this.status === IncentiveStatus.PAID) {
      throw new Error('Cannot reject already paid incentive');
    }

    this.status = IncentiveStatus.REJECTED;
    this.processedAt = new Date();

    this.addEvent(
      new IncentiveRejectedEvent(
        this.id.getValue(),
        this.recipient.getIP(),
        reason,
        new Date(),
      ),
    );
  }

  // 执行支付
  /**
   * Performs the execute payment operation.
   * @param paymentMethod - The payment method.
   * @param transactionId - The transaction id.
   * @returns The PaymentResult.
   */
  public executePayment(
    paymentMethod: PaymentMethod,
    transactionId: string,
  ): PaymentResult {
    if (this.status !== IncentiveStatus.APPROVED) {
      return PaymentResult.failed(
        `Cannot pay incentive in ${this.status} status`,
      );
    }

    try {
      // 业务逻辑验证
      this.validatePaymentConditions();

      this.status = IncentiveStatus.PAID;
      this.paidAt = new Date();

      this.addEvent(
        new IncentivePaidEvent(
          this.id.getValue(),
          this.recipient.getIP(),
          this.reward.getAmount(),
          this.reward.getCurrency(),
          paymentMethod,
          transactionId,
          new Date(),
        ),
      );

      return PaymentResult.success(
        transactionId,
        this.reward.getAmount(),
        this.reward.getCurrency(),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Payment failed';

      this.addEvent(
        new PaymentFailedEvent(
          this.id.getValue(),
          this.recipient.getIP(),
          errorMessage,
          new Date(),
        ),
      );

      return PaymentResult.failed(errorMessage);
    }
  }

  private validatePaymentConditions(): void {
    if (this.reward.getAmount() <= 0) {
      throw new Error('Invalid reward amount for payment');
    }

    if (!this.recipient.hasValidContactInfo()) {
      throw new Error('Valid contact information required for payment');
    }

    // 检查是否在合理时间范围内
    const daysSinceCreation =
      (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation > 30) {
      throw new Error('Incentive has expired (>30 days old)');
    }
  }

  // 查询方法
  /**
   * Retrieves incentive summary.
   * @returns The IncentiveSummary.
   */
  public getIncentiveSummary(): IncentiveSummary {
    return new IncentiveSummary({
      id: this.id.getValue(),
      recipientIP: this.recipient.getIP(),
      rewardAmount: this.reward.getAmount(),
      rewardCurrency: this.reward.getCurrency(),
      triggerType: this.trigger.getTriggerType(),
      status: this.status,
      createdAt: this.createdAt,
      processedAt: this.processedAt,
      paidAt: this.paidAt,
      canBePaid: this.canBePaid(),
      daysSinceCreation: Math.floor(
        (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    });
  }

  private canBePaid(): boolean {
    return (
      this.status === IncentiveStatus.APPROVED &&
      this.recipient.hasValidContactInfo() &&
      this.reward.getAmount() > 0
    );
  }

  // 领域事件管理
  /**
   * Retrieves uncommitted events.
   * @returns The an array of DomainEvent.
   */
  public getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Performs the mark events as committed operation.
   */
  public markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  // Getters
  /**
   * Retrieves id.
   * @returns The IncentiveId.
   */
  public getId(): IncentiveId {
    return this.id;
  }

  /**
   * Retrieves status.
   * @returns The IncentiveStatus.
   */
  public getStatus(): IncentiveStatus {
    return this.status;
  }

  /**
   * Retrieves recipient ip.
   * @returns The string value.
   */
  public getRecipientIP(): string {
    return this.recipient.getIP();
  }

  /**
   * Retrieves reward amount.
   * @returns The number value.
   */
  public getRewardAmount(): number {
    return this.reward.getAmount();
  }

  /**
   * Retrieves created at.
   * @returns The Date.
   */
  public getCreatedAt(): Date {
    return this.createdAt;
  }
}

// 接口定义
/**
 * Defines the shape of the incentive data.
 */
export interface IncentiveData {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recipient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reward: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trigger: any;
  status: IncentiveStatus;
  createdAt: string;
  processedAt?: string;
  paidAt?: string;
}

// 枚举定义
export enum IncentiveStatus {
  PENDING_VALIDATION = 'pending_validation',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
  EXPIRED = 'expired',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export enum Currency {
  CNY = 'CNY',
  USD = 'USD',
}

export enum RewardType {
  QUESTIONNAIRE_COMPLETION = 'questionnaire_completion',
  REFERRAL = 'referral',
  PROMOTION = 'promotion',
}

export enum TriggerType {
  QUESTIONNAIRE_COMPLETION = 'questionnaire_completion',
  REFERRAL = 'referral',
  SYSTEM_PROMOTION = 'system_promotion',
}

export enum PaymentMethod {
  WECHAT_PAY = 'wechat_pay',
  ALIPAY = 'alipay',
  BANK_TRANSFER = 'bank_transfer',
  MANUAL = 'manual',
}
