import { Incentive } from '../aggregates/incentive.aggregate.js';
import { ContactInfo } from '../value-objects/contact-info.value-object.js';
import { TriggerType, PaymentMethod } from '../aggregates/incentive.aggregate.js';

/**
 * 激励系统业务规则引擎
 * 包含所有激励创建、验证、支付等核心业务规则
 */
export class IncentiveRules {
  // 业务规则常量
  static readonly MAX_DAILY_INCENTIVES = 3;
  static readonly MIN_QUALITY_SCORE = 50;
  static readonly HIGH_QUALITY_THRESHOLD = 70;
  static readonly EXCELLENT_QUALITY_THRESHOLD = 90;
  
  // 支付相关常量
  static readonly MIN_PAYMENT_AMOUNT = 0.01;
  static readonly MAX_PAYMENT_AMOUNT = 100;
  static readonly PAYMENT_EXPIRY_DAYS = 30;

  /**
   * 检查是否可以创建激励
   */
  static canCreateIncentive(
    ip: string,
    triggerType: TriggerType,
    triggerData: any,
    todayIncentiveCount: number
  ): IncentiveEligibilityResult {
    const errors: string[] = [];

    // 验证IP格式
    if (!this.isValidIPAddress(ip)) {
      errors.push('Invalid IP address format');
    }

    // 检查每日激励限制
    if (todayIncentiveCount >= this.MAX_DAILY_INCENTIVES) {
      errors.push(`Daily incentive limit exceeded (max ${this.MAX_DAILY_INCENTIVES})`);
    }

    // 特定触发类型的验证
    switch (triggerType) {
      case TriggerType.QUESTIONNAIRE_COMPLETION:
        if (!triggerData.questionnaireId) {
          errors.push('Questionnaire ID is required');
        }
        if (typeof triggerData.qualityScore !== 'number' || 
            triggerData.qualityScore < this.MIN_QUALITY_SCORE) {
          errors.push(`Quality score must be at least ${this.MIN_QUALITY_SCORE}`);
        }
        break;

      case TriggerType.REFERRAL:
        if (!triggerData.referredIP || !this.isValidIPAddress(triggerData.referredIP)) {
          errors.push('Valid referred IP address is required');
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
      errors
    );
  }

  /**
   * 检查激励是否可以支付
   */
  static canPayIncentive(incentive: Incentive): PaymentEligibilityResult {
    const errors: string[] = [];

    // 检查激励状态
    if (incentive.getStatus() !== 'approved') {
      errors.push('Incentive must be approved before payment');
    }

    // 检查奖励金额
    const amount = incentive.getRewardAmount();
    if (amount < this.MIN_PAYMENT_AMOUNT) {
      errors.push(`Payment amount too small (min ${this.MIN_PAYMENT_AMOUNT})`);
    }
    if (amount > this.MAX_PAYMENT_AMOUNT) {
      errors.push(`Payment amount too large (max ${this.MAX_PAYMENT_AMOUNT})`);
    }

    // 检查是否过期
    const daysSinceCreation = (Date.now() - incentive.getCreatedAt().getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation > this.PAYMENT_EXPIRY_DAYS) {
      errors.push(`Incentive has expired (${daysSinceCreation.toFixed(1)} days old, max ${this.PAYMENT_EXPIRY_DAYS})`);
    }

    return new PaymentEligibilityResult(
      errors.length === 0,
      errors
    );
  }

  /**
   * 验证支付方式与联系信息的兼容性
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
        if (!contactInfo.alipay && !contactInfo.phone) {
          errors.push('Alipay account or phone number is required for Alipay');
        }
        break;

      case PaymentMethod.BANK_TRANSFER:
        if (!contactInfo.email && !contactInfo.phone) {
          errors.push('Email or phone number is required for bank transfer');
        }
        break;

      case PaymentMethod.MANUAL:
        // 手动支付不需要特定的联系信息验证
        break;

      default:
        errors.push(`Unsupported payment method: ${paymentMethod}`);
    }

    if (!contactInfo.isValid()) {
      errors.push(...contactInfo.getValidationErrors());
    }

    return new PaymentMethodValidationResult(
      errors.length === 0,
      errors
    );
  }

  /**
   * 验证批量支付
   */
  static validateBatchPayment(incentives: Incentive[]): BatchPaymentValidationResult {
    const errors: string[] = [];

    if (incentives.length === 0) {
      errors.push('No incentives provided for batch payment');
      return new BatchPaymentValidationResult(false, errors);
    }

    if (incentives.length > 100) {
      errors.push('Batch payment limited to 100 incentives at once');
    }

    let totalAmount = 0;
    const duplicateIds = new Set<string>();
    const seenIds = new Set<string>();

    for (const incentive of incentives) {
      const id = incentive.getId().getValue();
      
      if (seenIds.has(id)) {
        duplicateIds.add(id);
      }
      seenIds.add(id);

      totalAmount += incentive.getRewardAmount();

      // 检查每个激励的支付资格
      const eligibility = this.canPayIncentive(incentive);
      if (!eligibility.isEligible) {
        errors.push(`Incentive ${id}: ${eligibility.errors.join(', ')}`);
      }
    }

    if (duplicateIds.size > 0) {
      errors.push(`Duplicate incentive IDs found: ${Array.from(duplicateIds).join(', ')}`);
    }

    if (totalAmount > 1000) {
      errors.push(`Total batch payment amount (${totalAmount}) exceeds limit (1000)`);
    }

    return new BatchPaymentValidationResult(
      errors.length === 0,
      errors
    );
  }

  /**
   * 计算激励处理优先级
   */
  static calculateProcessingPriority(incentive: Incentive): IncentivePriority {
    let score = 0;
    const factors: string[] = [];

    // 基于奖励金额的优先级
    const amount = incentive.getRewardAmount();
    if (amount >= 8) {
      score += 30;
      factors.push('High reward amount');
    } else if (amount >= 5) {
      score += 20;
      factors.push('Medium reward amount');
    } else {
      score += 10;
      factors.push('Standard reward amount');
    }

    // 基于创建时间的紧急程度
    const daysSinceCreation = (Date.now() - incentive.getCreatedAt().getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation >= 25) {
      score += 25;
      factors.push('Near expiry');
    } else if (daysSinceCreation >= 20) {
      score += 15;
      factors.push('Aging incentive');
    } else if (daysSinceCreation >= 7) {
      score += 10;
      factors.push('Week-old incentive');
    }

    // 基于状态的优先级
    switch (incentive.getStatus()) {
      case 'approved':
        score += 20;
        factors.push('Ready for payment');
        break;
      case 'pending_validation':
        score += 5;
        factors.push('Pending validation');
        break;
    }

    return new IncentivePriority(score, factors);
  }

  /**
   * 执行风险评估
   */
  static assessIncentiveRisk(
    ip: string,
    todayIncentiveCount: number,
    recentIncentiveHistory: number[]
  ): IncentiveRiskAssessment {
    let riskScore = 0;
    const riskFactors: string[] = [];

    // IP频繁使用风险
    if (todayIncentiveCount >= this.MAX_DAILY_INCENTIVES) {
      riskScore += 40;
      riskFactors.push('Max daily limit reached');
    } else if (todayIncentiveCount >= 2) {
      riskScore += 20;
      riskFactors.push('High daily usage');
    }

    // 历史模式分析
    if (recentIncentiveHistory.length >= 7) {
      const averageDaily = recentIncentiveHistory.reduce((a, b) => a + b, 0) / recentIncentiveHistory.length;
      if (averageDaily >= 2.5) {
        riskScore += 30;
        riskFactors.push('Consistent high usage pattern');
      }
    }

    // IP地址有效性
    if (!this.isValidIPAddress(ip)) {
      riskScore += 50;
      riskFactors.push('Invalid IP address');
    }

    const riskLevel = riskScore >= 60 ? 'HIGH' : 
                     riskScore >= 30 ? 'MEDIUM' : 'LOW';

    return new IncentiveRiskAssessment(riskScore, riskLevel, riskFactors);
  }

  /**
   * 验证IP地址格式
   */
  static isValidIPAddress(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return false;
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * 获取使用历史统计
   */
  static analyzeUsageHistory(incentives: Incentive[]): IncentiveUsageHistory {
    const statusCounts = {
      pending: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
      expired: 0
    };

    let totalAmount = 0;
    let paidAmount = 0;
    const dailyStats = new Map<string, number>();

    for (const incentive of incentives) {
      const status = incentive.getStatus();
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      }

      const amount = incentive.getRewardAmount();
      totalAmount += amount;
      if (status === 'paid') {
        paidAmount += amount;
      }

      // 按日统计
      const dateKey = incentive.getCreatedAt().toDateString();
      dailyStats.set(dateKey, (dailyStats.get(dateKey) || 0) + 1);
    }

    return new IncentiveUsageHistory({
      totalIncentives: incentives.length,
      statusBreakdown: statusCounts,
      totalAmount,
      paidAmount,
      conversionRate: incentives.length > 0 ? (statusCounts.paid / incentives.length) * 100 : 0,
      dailyDistribution: Object.fromEntries(dailyStats)
    });
  }
}

// 结果类定义
export class IncentiveEligibilityResult {
  constructor(
    public readonly isEligible: boolean,
    public readonly errors: string[]
  ) {}
}

export class PaymentEligibilityResult {
  constructor(
    public readonly isEligible: boolean,
    public readonly errors: string[]
  ) {}
}

export class PaymentMethodValidationResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[]
  ) {}
}

export class BatchPaymentValidationResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[]
  ) {}
}

export class IncentivePriority {
  constructor(
    public readonly score: number,
    public readonly factors: string[]
  ) {}
}

export class IncentiveRiskAssessment {
  constructor(
    public readonly riskScore: number,
    public readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    public readonly riskFactors: string[]
  ) {}
}

export class IncentiveUsageHistory {
  constructor(public readonly data: {
    totalIncentives: number;
    statusBreakdown: {
      pending: number;
      approved: number;
      paid: number;
      rejected: number;
      expired: number;
    };
    totalAmount: number;
    paidAmount: number;
    conversionRate: number;
    dailyDistribution: Record<string, number>;
  }) {}

  get totalIncentives(): number { return this.data.totalIncentives; }
  get conversionRate(): number { return this.data.conversionRate; }
  get totalAmount(): number { return this.data.totalAmount; }
  get paidAmount(): number { return this.data.paidAmount; }
}
