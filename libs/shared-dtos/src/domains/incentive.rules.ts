import { 
  Incentive, 
  IncentiveReward, 
  IncentiveStatus, 
  Currency, 
  RewardType, 
  TriggerType,
  PaymentMethod,
  ContactInfo 
} from './incentive.dto';

export class IncentiveRules {
  // 核心业务规则常量 - 红包激励系统
  static readonly BASE_QUESTIONNAIRE_REWARD = 5; // 5元基础奖励
  static readonly HIGH_QUALITY_BONUS = 3;        // 高质量额外奖励（8元总计）
  static readonly BASIC_QUALITY_PENALTY = 2;     // 基础质量惩罚（3元总计）
  static readonly MIN_QUALITY_SCORE = 50;        // 最低获得奖励分数
  static readonly HIGH_QUALITY_THRESHOLD = 90;   // 高质量阈值
  static readonly STANDARD_QUALITY_THRESHOLD = 70; // 标准质量阈值
  
  // 推荐奖励常量
  static readonly REFERRAL_REWARD_AMOUNT = 3;    // 推荐奖励3元
  
  // 系统限制常量
  static readonly MAX_REWARD_AMOUNT = 100;       // 单笔最大奖励100元
  static readonly MIN_REWARD_AMOUNT = 1;         // 单笔最小奖励1元
  static readonly INCENTIVE_EXPIRY_DAYS = 30;    // 激励过期时间30天
  static readonly MAX_DAILY_INCENTIVES_PER_IP = 3; // 每IP每日最大激励数量
  
  // 支付相关常量
  static readonly MIN_PAYOUT_AMOUNT = 5;         // 最小提现金额5元
  static readonly PAYMENT_PROCESSING_TIMEOUT_MINUTES = 30; // 支付处理超时30分钟

  /**
   * 验证激励创建的资格条件
   */
  static canCreateIncentive(
    ip: string, 
    triggerType: TriggerType, 
    triggerData: any,
    existingIncentivesToday?: number
  ): IncentiveEligibilityResult {
    const errors: string[] = [];

    // 验证IP地址格式
    if (!this.isValidIPAddress(ip)) {
      errors.push('Valid IP address is required');
    }

    // 验证每日激励限制
    const todayIncentives = existingIncentivesToday || 0;
    if (todayIncentives >= this.MAX_DAILY_INCENTIVES_PER_IP) {
      errors.push(`Daily incentive limit reached (${this.MAX_DAILY_INCENTIVES_PER_IP} per IP)`);
    }

    // 根据触发类型验证特定条件
    switch (triggerType) {
      case TriggerType.QUESTIONNAIRE_COMPLETION:
        if (!triggerData.questionnaireId) {
          errors.push('Questionnaire ID is required');
        }
        if (typeof triggerData.qualityScore !== 'number' || 
            triggerData.qualityScore < 0 || 
            triggerData.qualityScore > 100) {
          errors.push('Valid quality score (0-100) is required');
        }
        if (triggerData.qualityScore < this.MIN_QUALITY_SCORE) {
          errors.push(`Quality score must be at least ${this.MIN_QUALITY_SCORE} to qualify for reward`);
        }
        break;

      case TriggerType.REFERRAL:
        if (!triggerData.referredIP) {
          errors.push('Referred IP address is required');
        }
        if (!this.isValidIPAddress(triggerData.referredIP)) {
          errors.push('Referred IP address must be valid');
        }
        if (triggerData.referredIP === ip) {
          errors.push('Cannot refer yourself');
        }
        break;

      default:
        errors.push(`Unsupported trigger type: ${triggerType}`);
    }

    return new IncentiveEligibilityResult(
      errors.length === 0,
      errors,
      errors.length === 0 ? this.calculateExpectedReward(triggerType, triggerData) : 0
    );
  }

  /**
   * 计算预期奖励金额
   */
  static calculateExpectedReward(triggerType: TriggerType, triggerData: any): number {
    switch (triggerType) {
      case TriggerType.QUESTIONNAIRE_COMPLETION:
        return this.calculateQuestionnaireReward(triggerData.qualityScore);
      
      case TriggerType.REFERRAL:
        return this.REFERRAL_REWARD_AMOUNT;
      
      default:
        return 0;
    }
  }

  /**
   * 根据质量分数计算问卷完成奖励
   */
  static calculateQuestionnaireReward(qualityScore: number): number {
    if (qualityScore >= this.HIGH_QUALITY_THRESHOLD) {
      return this.BASE_QUESTIONNAIRE_REWARD + this.HIGH_QUALITY_BONUS; // 8元
    } else if (qualityScore >= this.STANDARD_QUALITY_THRESHOLD) {
      return this.BASE_QUESTIONNAIRE_REWARD; // 5元
    } else if (qualityScore >= this.MIN_QUALITY_SCORE) {
      return this.BASE_QUESTIONNAIRE_REWARD - this.BASIC_QUALITY_PENALTY; // 3元
    } else {
      return 0; // 不符合最低标准
    }
  }

  /**
   * 验证激励是否可以支付
   */
  static canPayIncentive(incentive: Incentive): PaymentEligibilityResult {
    const errors: string[] = [];

    // 验证状态
    if (incentive.getStatus() !== IncentiveStatus.APPROVED) {
      errors.push(`Incentive must be approved for payment (current status: ${incentive.getStatus()})`);
    }

    // 验证奖励金额
    const rewardAmount = incentive.getRewardAmount();
    if (rewardAmount < this.MIN_PAYOUT_AMOUNT) {
      errors.push(`Reward amount (${rewardAmount}) is below minimum payout threshold (${this.MIN_PAYOUT_AMOUNT})`);
    }

    if (rewardAmount > this.MAX_REWARD_AMOUNT) {
      errors.push(`Reward amount (${rewardAmount}) exceeds maximum allowed (${this.MAX_REWARD_AMOUNT})`);
    }

    // 验证过期状态
    const daysSinceCreation = Math.floor(
      (Date.now() - incentive.getCreatedAt().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation > this.INCENTIVE_EXPIRY_DAYS) {
      errors.push(`Incentive has expired (${daysSinceCreation} days old, limit: ${this.INCENTIVE_EXPIRY_DAYS})`);
    }

    return new PaymentEligibilityResult(
      errors.length === 0,
      errors,
      errors.length === 0 ? rewardAmount : 0
    );
  }

  /**
   * 验证支付方式和联系信息匹配
   */
  static validatePaymentMethodCompatibility(
    paymentMethod: PaymentMethod,
    contactInfo: ContactInfo
  ): PaymentMethodValidationResult {
    const errors: string[] = [];

    switch (paymentMethod) {
      case PaymentMethod.WECHAT_PAY:
        if (!contactInfo.wechat) {
          errors.push('WeChat ID is required for WeChat Pay');
        }
        break;

      case PaymentMethod.ALIPAY:
        if (!contactInfo.alipay) {
          errors.push('Alipay account is required for Alipay payment');
        }
        break;

      case PaymentMethod.BANK_TRANSFER:
        if (!contactInfo.phone && !contactInfo.email) {
          errors.push('Phone or email is required for bank transfer verification');
        }
        break;

      case PaymentMethod.MANUAL:
        // Manual payment requires at least one contact method
        if (!contactInfo.isValid()) {
          errors.push('Valid contact information is required for manual payment');
        }
        break;

      default:
        errors.push(`Unsupported payment method: ${paymentMethod}`);
    }

    return new PaymentMethodValidationResult(
      errors.length === 0,
      errors,
      paymentMethod
    );
  }

  /**
   * 计算激励处理优先级
   */
  static calculateProcessingPriority(incentive: Incentive): IncentivePriority {
    let priority = 0;
    const factors: string[] = [];

    const rewardAmount = incentive.getRewardAmount();
    const daysSinceCreation = Math.floor(
      (Date.now() - incentive.getCreatedAt().getTime()) / (1000 * 60 * 60 * 24)
    );

    // 金额因子 (0-30分)
    if (rewardAmount >= 8) {
      priority += 30;
      factors.push('High reward amount');
    } else if (rewardAmount >= 5) {
      priority += 20;
      factors.push('Standard reward amount');
    } else {
      priority += 10;
      factors.push('Basic reward amount');
    }

    // 时间因子 (0-25分)
    if (daysSinceCreation >= 7) {
      priority += 25;
      factors.push('Long pending time');
    } else if (daysSinceCreation >= 3) {
      priority += 15;
      factors.push('Moderate pending time');
    } else {
      priority += 5;
      factors.push('Recent creation');
    }

    // 状态因子 (0-20分)
    switch (incentive.getStatus()) {
      case IncentiveStatus.APPROVED:
        priority += 20;
        factors.push('Ready for payment');
        break;
      case IncentiveStatus.PENDING_VALIDATION:
        priority += 10;
        factors.push('Awaiting validation');
        break;
      default:
        priority += 0;
    }

    // 过期风险因子 (0-25分)
    const daysUntilExpiry = this.INCENTIVE_EXPIRY_DAYS - daysSinceCreation;
    if (daysUntilExpiry <= 3) {
      priority += 25;
      factors.push('Expiry risk - urgent processing needed');
    } else if (daysUntilExpiry <= 7) {
      priority += 15;
      factors.push('Moderate expiry risk');
    } else {
      priority += 0;
    }

    return new IncentivePriority(
      Math.min(100, priority),
      this.getPriorityLevel(priority),
      factors
    );
  }

  /**
   * 生成激励风险评估报告
   */
  static generateRiskAssessment(
    incentive: Incentive,
    ipUsageHistory?: IncentiveUsageHistory
  ): IncentiveRiskAssessment {
    let riskScore = 0;
    const riskFactors: string[] = [];

    const rewardAmount = incentive.getRewardAmount();
    const daysSinceCreation = Math.floor(
      (Date.now() - incentive.getCreatedAt().getTime()) / (1000 * 60 * 60 * 24)
    );

    // 金额风险评估
    if (rewardAmount >= this.MAX_REWARD_AMOUNT * 0.5) {
      riskScore += 30;
      riskFactors.push('High reward amount');
    }

    // 使用历史风险评估
    if (ipUsageHistory) {
      if (ipUsageHistory.totalIncentivesToday >= this.MAX_DAILY_INCENTIVES_PER_IP * 0.8) {
        riskScore += 25;
        riskFactors.push('High daily usage');
      }

      if (ipUsageHistory.totalIncentivesThisWeek >= this.MAX_DAILY_INCENTIVES_PER_IP * 5) {
        riskScore += 20;
        riskFactors.push('High weekly usage');
      }

      if (ipUsageHistory.consecutiveDaysActive >= 5) {
        riskScore += 15;
        riskFactors.push('Sustained high activity');
      }
    }

    // 时间风险评估
    if (daysSinceCreation >= this.INCENTIVE_EXPIRY_DAYS * 0.9) {
      riskScore += 10;
      riskFactors.push('Near expiry');
    }

    return new IncentiveRiskAssessment(
      incentive.getId().getValue(),
      incentive.getRecipientIP(),
      Math.min(100, riskScore),
      this.getRiskLevel(riskScore),
      riskFactors,
      this.getRecommendedActions(riskScore)
    );
  }

  /**
   * 验证批量支付操作
   */
  static validateBatchPayment(incentives: Incentive[]): BatchPaymentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalAmount = 0;
    const paymentMethods = new Set<PaymentMethod>();

    if (incentives.length === 0) {
      errors.push('No incentives provided for batch payment');
      return new BatchPaymentValidationResult(false, errors, warnings, 0, 0);
    }

    if (incentives.length > 100) {
      errors.push('Batch payment limited to 100 incentives per operation');
    }

    let validCount = 0;
    for (const incentive of incentives) {
      const eligibility = this.canPayIncentive(incentive);
      if (eligibility.isEligible) {
        validCount++;
        totalAmount += eligibility.approvedAmount;
      } else {
        warnings.push(`Incentive ${incentive.getId().getValue()}: ${eligibility.errors.join(', ')}`);
      }
    }

    if (validCount === 0) {
      errors.push('No valid incentives found for payment');
    }

    if (totalAmount > 10000) {
      warnings.push(`Large batch payment amount: ¥${totalAmount}. Consider splitting into smaller batches.`);
    }

    return new BatchPaymentValidationResult(
      errors.length === 0,
      errors,
      warnings,
      validCount,
      totalAmount
    );
  }

  // 私有辅助方法
  private static isValidIPAddress(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return false;
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  private static getPriorityLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (score >= 80) return 'URGENT';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  private static getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  }

  private static getRecommendedActions(riskScore: number): string[] {
    const actions: string[] = [];

    if (riskScore >= 75) {
      actions.push('Require manual approval');
      actions.push('Enhanced verification');
      actions.push('Flag for audit');
    } else if (riskScore >= 50) {
      actions.push('Additional verification');
      actions.push('Monitor closely');
    } else if (riskScore >= 25) {
      actions.push('Standard verification');
      actions.push('Routine monitoring');
    } else {
      actions.push('Standard processing');
    }

    return actions;
  }
}

// 结果类定义
export class IncentiveEligibilityResult {
  constructor(
    public readonly isEligible: boolean,
    public readonly errors: string[],
    public readonly expectedReward: number
  ) {}
}

export class PaymentEligibilityResult {
  constructor(
    public readonly isEligible: boolean,
    public readonly errors: string[],
    public readonly approvedAmount: number
  ) {}
}

export class PaymentMethodValidationResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[],
    public readonly paymentMethod: PaymentMethod
  ) {}
}

export class IncentivePriority {
  constructor(
    public readonly score: number,
    public readonly level: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    public readonly factors: string[]
  ) {}
}

export class IncentiveRiskAssessment {
  constructor(
    public readonly incentiveId: string,
    public readonly recipientIP: string,
    public readonly riskScore: number,
    public readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    public readonly riskFactors: string[],
    public readonly recommendedActions: string[]
  ) {}
}

export class BatchPaymentValidationResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[],
    public readonly warnings: string[],
    public readonly validIncentiveCount: number,
    public readonly totalAmount: number
  ) {}
}

// 接口定义
export interface IncentiveUsageHistory {
  ip: string;
  totalIncentivesToday: number;
  totalIncentivesThisWeek: number;
  totalIncentivesThisMonth: number;
  consecutiveDaysActive: number;
  lastIncentiveDate?: Date;
  averageQualityScore?: number;
}

// 枚举定义
export enum IncentiveRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ProcessingPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high', 
  URGENT = 'urgent'
}