import { ValueObject } from '../base/value-object';
import { DomainEvent } from '../base/domain-event';

// Incentive聚合根 - 管理红包激励系统的核心业务逻辑
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
    private paidAt?: Date
  ) {}

  // 工厂方法 - 创建问卷完成激励
  static createQuestionnaireIncentive(
    ip: string,
    questionnaireId: string,
    qualityScore: number,
    contactInfo: ContactInfo
  ): Incentive {
    const incentiveId = IncentiveId.generate();
    const recipient = IncentiveRecipient.create(ip, contactInfo);
    const trigger = IncentiveTrigger.fromQuestionnaire(questionnaireId, qualityScore);
    const reward = IncentiveReward.calculateForQuestionnaire(qualityScore);

    const incentive = new Incentive(
      incentiveId,
      recipient,
      reward,
      trigger,
      IncentiveStatus.PENDING_VALIDATION,
      new Date()
    );

    incentive.addEvent(new IncentiveCreatedEvent(
      incentiveId.getValue(),
      ip,
      reward.getAmount(),
      reward.getCurrency(),
      trigger.getTriggerType(),
      new Date()
    ));

    // 如果质量足够高，自动进入处理状态
    if (qualityScore >= 70) {
      incentive.approveForProcessing('High quality questionnaire completion');
    }

    return incentive;
  }

  // 工厂方法 - 创建推荐激励
  static createReferralIncentive(
    referrerIP: string,
    referredIP: string,
    contactInfo: ContactInfo
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
      new Date()
    );

    incentive.addEvent(new IncentiveCreatedEvent(
      incentiveId.getValue(),
      referrerIP,
      reward.getAmount(),
      reward.getCurrency(),
      trigger.getTriggerType(),
      new Date()
    ));

    return incentive;
  }

  // 工厂方法 - 从持久化数据恢复
  static restore(data: IncentiveData): Incentive {
    return new Incentive(
      new IncentiveId({ value: data.id }),
      IncentiveRecipient.restore(data.recipient),
      IncentiveReward.restore(data.reward),
      IncentiveTrigger.restore(data.trigger),
      data.status,
      new Date(data.createdAt),
      data.processedAt ? new Date(data.processedAt) : undefined,
      data.paidAt ? new Date(data.paidAt) : undefined
    );
  }

  // 核心业务方法 - 验证激励资格
  validateEligibility(): IncentiveValidationResult {
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
      this.addEvent(new IncentiveValidatedEvent(
        this.id.getValue(),
        this.recipient.getIP(),
        this.reward.getAmount(),
        new Date()
      ));
    } else {
      this.addEvent(new IncentiveValidationFailedEvent(
        this.id.getValue(),
        this.recipient.getIP(),
        validationErrors,
        new Date()
      ));
    }

    return result;
  }

  // 批准处理
  approveForProcessing(reason: string): void {
    if (this.status !== IncentiveStatus.PENDING_VALIDATION) {
      throw new Error(`Cannot approve incentive in ${this.status} status`);
    }

    this.status = IncentiveStatus.APPROVED;
    this.processedAt = new Date();

    this.addEvent(new IncentiveApprovedEvent(
      this.id.getValue(),
      this.recipient.getIP(),
      this.reward.getAmount(),
      reason,
      new Date()
    ));
  }

  // 拒绝激励
  reject(reason: string): void {
    if (this.status === IncentiveStatus.PAID) {
      throw new Error('Cannot reject already paid incentive');
    }

    this.status = IncentiveStatus.REJECTED;
    this.processedAt = new Date();

    this.addEvent(new IncentiveRejectedEvent(
      this.id.getValue(),
      this.recipient.getIP(),
      reason,
      new Date()
    ));
  }

  // 执行支付
  executePayment(paymentMethod: PaymentMethod, transactionId: string): PaymentResult {
    if (this.status !== IncentiveStatus.APPROVED) {
      return PaymentResult.failed(`Cannot pay incentive in ${this.status} status`);
    }

    try {
      // 业务逻辑验证
      this.validatePaymentConditions();

      this.status = IncentiveStatus.PAID;
      this.paidAt = new Date();

      this.addEvent(new IncentivePaidEvent(
        this.id.getValue(),
        this.recipient.getIP(),
        this.reward.getAmount(),
        this.reward.getCurrency(),
        paymentMethod,
        transactionId,
        new Date()
      ));

      return PaymentResult.success(
        transactionId,
        this.reward.getAmount(),
        this.reward.getCurrency()
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      
      this.addEvent(new PaymentFailedEvent(
        this.id.getValue(),
        this.recipient.getIP(),
        errorMessage,
        new Date()
      ));

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
    const daysSinceCreation = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation > 30) {
      throw new Error('Incentive has expired (>30 days old)');
    }
  }

  // 查询方法
  getIncentiveSummary(): IncentiveSummary {
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
      daysSinceCreation: Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    });
  }

  private canBePaid(): boolean {
    return this.status === IncentiveStatus.APPROVED && 
           this.recipient.hasValidContactInfo() &&
           this.reward.getAmount() > 0;
  }

  // 领域事件管理
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  // Getters
  getId(): IncentiveId {
    return this.id;
  }

  getStatus(): IncentiveStatus {
    return this.status;
  }

  getRecipientIP(): string {
    return this.recipient.getIP();
  }

  getRewardAmount(): number {
    return this.reward.getAmount();
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}

// 值对象定义
export class IncentiveId extends ValueObject<{ value: string }> {
  static generate(): IncentiveId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return new IncentiveId({ value: `incentive_${timestamp}_${random}` });
  }
  
  getValue(): string {
    return this.props.value;
  }
}

export class IncentiveRecipient extends ValueObject<{
  ip: string;
  contactInfo: ContactInfo;
  verificationStatus: VerificationStatus;
}> {
  static create(ip: string, contactInfo: ContactInfo): IncentiveRecipient {
    return new IncentiveRecipient({
      ip,
      contactInfo,
      verificationStatus: VerificationStatus.PENDING
    });
  }

  static restore(data: any): IncentiveRecipient {
    return new IncentiveRecipient({
      ip: data.ip,
      contactInfo: ContactInfo.restore(data.contactInfo),
      verificationStatus: data.verificationStatus
    });
  }

  getIP(): string {
    return this.props.ip;
  }

  hasValidContactInfo(): boolean {
    return this.props.contactInfo.isValid();
  }

  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.props.ip || !/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(this.props.ip)) {
      errors.push('Valid IP address is required');
    }

    if (!this.props.contactInfo.isValid()) {
      errors.push(...this.props.contactInfo.getValidationErrors());
    }

    return errors;
  }
}

export class ContactInfo extends ValueObject<{
  email?: string;
  phone?: string;
  wechat?: string;
  alipay?: string;
}> {
  static restore(data: any): ContactInfo {
    return new ContactInfo(data);
  }

  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    const { email, phone, wechat, alipay } = this.props;

    // 至少需要一种联系方式
    if (!email && !phone && !wechat && !alipay) {
      errors.push('At least one contact method is required');
      return errors;
    }

    // 验证邮箱格式
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    }

    // 验证手机号格式（中国大陆）
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      errors.push('Invalid phone number format');
    }

    // 验证微信号格式
    if (wechat && (wechat.length < 6 || wechat.length > 20)) {
      errors.push('WeChat ID must be 6-20 characters');
    }

    return errors;
  }

  getPrimaryContact(): string {
    if (this.props.wechat) return `WeChat: ${this.props.wechat}`;
    if (this.props.alipay) return `Alipay: ${this.props.alipay}`;
    if (this.props.phone) return `Phone: ${this.props.phone}`;
    if (this.props.email) return `Email: ${this.props.email}`;
    return 'No contact info';
  }

  get email(): string | undefined { return this.props.email; }
  get phone(): string | undefined { return this.props.phone; }
  get wechat(): string | undefined { return this.props.wechat; }
  get alipay(): string | undefined { return this.props.alipay; }
}

export class IncentiveReward extends ValueObject<{
  amount: number;
  currency: Currency;
  rewardType: RewardType;
  calculationMethod: string;
}> {
  static calculateForQuestionnaire(qualityScore: number): IncentiveReward {
    let amount = 0;
    let calculationMethod = '';

    if (qualityScore >= 90) {
      amount = 8; // 高质量奖励
      calculationMethod = 'High quality bonus (≥90 score)';
    } else if (qualityScore >= 70) {
      amount = 5; // 标准奖励
      calculationMethod = 'Standard quality bonus (≥70 score)';
    } else if (qualityScore >= 50) {
      amount = 3; // 基础奖励
      calculationMethod = 'Basic completion bonus (≥50 score)';
    } else {
      amount = 0;
      calculationMethod = 'No reward (score <50)';
    }

    return new IncentiveReward({
      amount,
      currency: Currency.CNY,
      rewardType: RewardType.QUESTIONNAIRE_COMPLETION,
      calculationMethod
    });
  }

  static createReferralReward(): IncentiveReward {
    return new IncentiveReward({
      amount: 3,
      currency: Currency.CNY,
      rewardType: RewardType.REFERRAL,
      calculationMethod: 'Fixed referral reward'
    });
  }

  static restore(data: any): IncentiveReward {
    return new IncentiveReward(data);
  }

  getAmount(): number {
    return this.props.amount;
  }

  getCurrency(): Currency {
    return this.props.currency;
  }

  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (this.props.amount < 0) {
      errors.push('Reward amount cannot be negative');
    }

    if (this.props.amount > 100) {
      errors.push('Reward amount cannot exceed 100 CNY');
    }

    if (!Object.values(Currency).includes(this.props.currency)) {
      errors.push('Invalid currency');
    }

    return errors;
  }
}

export class IncentiveTrigger extends ValueObject<{
  triggerType: TriggerType;
  triggerData: any;
  qualifiedAt: Date;
}> {
  static fromQuestionnaire(questionnaireId: string, qualityScore: number): IncentiveTrigger {
    return new IncentiveTrigger({
      triggerType: TriggerType.QUESTIONNAIRE_COMPLETION,
      triggerData: { questionnaireId, qualityScore },
      qualifiedAt: new Date()
    });
  }

  static fromReferral(referredIP: string): IncentiveTrigger {
    return new IncentiveTrigger({
      triggerType: TriggerType.REFERRAL,
      triggerData: { referredIP },
      qualifiedAt: new Date()
    });
  }

  static restore(data: any): IncentiveTrigger {
    return new IncentiveTrigger({
      ...data,
      qualifiedAt: new Date(data.qualifiedAt)
    });
  }

  getTriggerType(): TriggerType {
    return this.props.triggerType;
  }

  isValid(): boolean {
    const errors = this.getValidationErrors();
    return errors.length === 0;
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!Object.values(TriggerType).includes(this.props.triggerType)) {
      errors.push('Invalid trigger type');
    }

    if (!this.props.triggerData) {
      errors.push('Trigger data is required');
    }

    // 特定触发类型的验证
    switch (this.props.triggerType) {
      case TriggerType.QUESTIONNAIRE_COMPLETION:
        if (!this.props.triggerData.questionnaireId) {
          errors.push('Questionnaire ID is required');
        }
        if (typeof this.props.triggerData.qualityScore !== 'number' ||
            this.props.triggerData.qualityScore < 0 ||
            this.props.triggerData.qualityScore > 100) {
          errors.push('Valid quality score (0-100) is required');
        }
        break;

      case TriggerType.REFERRAL:
        if (!this.props.triggerData.referredIP) {
          errors.push('Referred IP is required');
        }
        break;
    }

    return errors;
  }
}

// 结果类
export class IncentiveValidationResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[]
  ) {}
}

export class PaymentResult {
  private constructor(
    public readonly success: boolean,
    public readonly transactionId?: string,
    public readonly amount?: number,
    public readonly currency?: Currency,
    public readonly error?: string
  ) {}

  static success(transactionId: string, amount: number, currency: Currency): PaymentResult {
    return new PaymentResult(true, transactionId, amount, currency);
  }

  static failed(error: string): PaymentResult {
    return new PaymentResult(false, undefined, undefined, undefined, error);
  }
}

export class IncentiveSummary extends ValueObject<{
  id: string;
  recipientIP: string;
  rewardAmount: number;
  rewardCurrency: Currency;
  triggerType: TriggerType;
  status: IncentiveStatus;
  createdAt: Date;
  processedAt?: Date;
  paidAt?: Date;
  canBePaid: boolean;
  daysSinceCreation: number;
}> {
  get id(): string { return this.props.id; }
  get recipientIP(): string { return this.props.recipientIP; }
  get rewardAmount(): number { return this.props.rewardAmount; }
  get status(): IncentiveStatus { return this.props.status; }
  get canBePaid(): boolean { return this.props.canBePaid; }
  get daysSinceCreation(): number { return this.props.daysSinceCreation; }
}

// 枚举定义
export enum IncentiveStatus {
  PENDING_VALIDATION = 'pending_validation',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
  EXPIRED = 'expired'
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed'
}

export enum Currency {
  CNY = 'CNY',
  USD = 'USD'
}

export enum RewardType {
  QUESTIONNAIRE_COMPLETION = 'questionnaire_completion',
  REFERRAL = 'referral',
  PROMOTION = 'promotion'
}

export enum TriggerType {
  QUESTIONNAIRE_COMPLETION = 'questionnaire_completion',
  REFERRAL = 'referral',
  SYSTEM_PROMOTION = 'system_promotion'
}

export enum PaymentMethod {
  WECHAT_PAY = 'wechat_pay',
  ALIPAY = 'alipay',
  BANK_TRANSFER = 'bank_transfer',
  MANUAL = 'manual'
}

// 接口定义
export interface IncentiveData {
  id: string;
  recipient: any;
  reward: any;
  trigger: any;
  status: IncentiveStatus;
  createdAt: string;
  processedAt?: string;
  paidAt?: string;
}

// 领域事件
export class IncentiveCreatedEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly rewardAmount: number,
    public readonly currency: Currency,
    public readonly triggerType: TriggerType,
    public readonly occurredAt: Date
  ) {}
}

export class IncentiveValidatedEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly rewardAmount: number,
    public readonly occurredAt: Date
  ) {}
}

export class IncentiveValidationFailedEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly errors: string[],
    public readonly occurredAt: Date
  ) {}
}

export class IncentiveApprovedEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly rewardAmount: number,
    public readonly reason: string,
    public readonly occurredAt: Date
  ) {}
}

export class IncentiveRejectedEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly reason: string,
    public readonly occurredAt: Date
  ) {}
}

export class IncentivePaidEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly amount: number,
    public readonly currency: Currency,
    public readonly paymentMethod: PaymentMethod,
    public readonly transactionId: string,
    public readonly occurredAt: Date
  ) {}
}

export class PaymentFailedEvent implements DomainEvent {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly error: string,
    public readonly occurredAt: Date
  ) {}
}