import type {
  ContactInfo,
  IncentiveValidationResult,
  PaymentResult} from '../domains/incentive.dto';
import {
  Incentive,
  IncentiveStatus,
  PaymentMethod
} from '../domains/incentive.dto';
import { IncentiveRules } from '../domains/incentive.rules';

/**
 * 激励系统的契约式编程实现
 * 提供前置条件、后置条件和不变式的验证
 */
export class IncentiveContracts {
  /**
   * 创建问卷激励的契约验证
   */
  static createQuestionnaireIncentive(
    ip: string,
    questionnaireId: string,
    qualityScore: number,
    contactInfo: ContactInfo,
  ): Incentive {
    // 前置条件验证
    this.requireValidIP(ip, 'createQuestionnaireIncentive');
    this.require(
      !!(questionnaireId && questionnaireId.trim().length > 0),
      'Questionnaire ID is required for incentive creation',
      'createQuestionnaireIncentive',
    );
    this.require(
      typeof qualityScore === 'number' &&
        qualityScore >= 0 &&
        qualityScore <= 100,
      'Quality score must be a number between 0 and 100',
      'createQuestionnaireIncentive',
    );
    this.require(
      contactInfo && contactInfo.isValid(),
      'Valid contact information is required',
      'createQuestionnaireIncentive',
    );

    // 执行创建
    const incentive = Incentive.createQuestionnaireIncentive(
      ip,
      questionnaireId,
      qualityScore,
      contactInfo,
    );

    // 后置条件验证
    this.ensure(
      incentive !== null && incentive !== undefined,
      'Incentive creation must return a valid instance',
      'createQuestionnaireIncentive',
    );
    this.ensure(
      incentive.getRecipientIP() === ip,
      'Created incentive must have correct IP address',
      'createQuestionnaireIncentive',
    );
    this.ensure(
      incentive.getStatus() === IncentiveStatus.PENDING_VALIDATION ||
        incentive.getStatus() === IncentiveStatus.APPROVED,
      'New incentive must be in pending validation or approved status',
      'createQuestionnaireIncentive',
    );
    this.ensure(
      incentive.getRewardAmount() > 0,
      'Created incentive must have positive reward amount',
      'createQuestionnaireIncentive',
    );

    return incentive;
  }

  /**
   * 创建推荐激励的契约验证
   */
  static createReferralIncentive(
    referrerIP: string,
    referredIP: string,
    contactInfo: ContactInfo,
  ): Incentive {
    // 前置条件验证
    this.requireValidIP(referrerIP, 'createReferralIncentive');
    this.requireValidIP(referredIP, 'createReferralIncentive');
    this.require(
      referrerIP !== referredIP,
      'Referrer and referred IP addresses must be different',
      'createReferralIncentive',
    );
    this.require(
      contactInfo && contactInfo.isValid(),
      'Valid contact information is required',
      'createReferralIncentive',
    );

    // 执行创建
    const incentive = Incentive.createReferralIncentive(
      referrerIP,
      referredIP,
      contactInfo,
    );

    // 后置条件验证
    this.ensure(
      incentive !== null && incentive !== undefined,
      'Referral incentive creation must return a valid instance',
      'createReferralIncentive',
    );
    this.ensure(
      incentive.getRecipientIP() === referrerIP,
      'Created referral incentive must have correct referrer IP',
      'createReferralIncentive',
    );
    this.ensure(
      incentive.getRewardAmount() === IncentiveRules.REFERRAL_REWARD_AMOUNT,
      'Referral incentive must have correct reward amount',
      'createReferralIncentive',
    );

    return incentive;
  }

  /**
   * 激励验证的契约检查
   */
  static validateIncentive(incentive: Incentive): IncentiveValidationResult {
    // 前置条件验证
    this.require(
      incentive !== null && incentive !== undefined,
      'Incentive is required for validation',
      'validateIncentive',
    );
    this.require(
      incentive.getStatus() !== IncentiveStatus.PAID,
      'Cannot validate already paid incentive',
      'validateIncentive',
    );

    // 验证不变式
    this.validateInvariants(incentive);

    // 执行验证
    const result = incentive.validateEligibility();

    // 后置条件验证
    this.ensure(
      result !== null && result !== undefined,
      'Validation must return a result',
      'validateIncentive',
    );
    this.ensure(
      typeof result.isValid === 'boolean',
      'Validation result must have boolean validity flag',
      'validateIncentive',
    );
    this.ensure(
      Array.isArray(result.errors),
      'Validation result must have errors array',
      'validateIncentive',
    );

    // 验证状态一致性
    if (result.isValid) {
      this.ensure(
        result.errors.length === 0,
        'Valid incentive must have no errors',
        'validateIncentive',
      );
    } else {
      this.ensure(
        result.errors.length > 0,
        'Invalid incentive must have at least one error',
        'validateIncentive',
      );
    }

    return result;
  }

  /**
   * 激励批准的契约检查
   */
  static approveIncentive(incentive: Incentive, reason: string): void {
    // 记录原始状态用于后置条件检查
    const originalStatus = incentive.getStatus();

    // 前置条件验证
    this.require(
      incentive !== null && incentive !== undefined,
      'Incentive is required for approval',
      'approveIncentive',
    );
    this.require(
      originalStatus === IncentiveStatus.PENDING_VALIDATION,
      'Only pending incentives can be approved',
      'approveIncentive',
    );
    this.require(
      !!(reason && reason.trim().length > 0),
      'Approval reason is required',
      'approveIncentive',
    );

    // 验证不变式
    this.validateInvariants(incentive);

    // 执行批准
    incentive.approveForProcessing(reason);

    // 后置条件验证
    this.ensure(
      incentive.getStatus() === IncentiveStatus.APPROVED,
      'Approved incentive must be in approved status',
      'approveIncentive',
    );
    this.ensure(
      incentive.getStatus() !== originalStatus,
      'Incentive status must change after approval',
      'approveIncentive',
    );
  }

  /**
   * 激励拒绝的契约检查
   */
  static rejectIncentive(incentive: Incentive, reason: string): void {
    // 记录原始状态用于后置条件检查
    const originalStatus = incentive.getStatus();

    // 前置条件验证
    this.require(
      incentive !== null && incentive !== undefined,
      'Incentive is required for rejection',
      'rejectIncentive',
    );
    this.require(
      originalStatus !== IncentiveStatus.PAID,
      'Cannot reject already paid incentive',
      'rejectIncentive',
    );
    this.require(
      !!(reason && reason.trim().length > 0),
      'Rejection reason is required',
      'rejectIncentive',
    );

    // 验证不变式
    this.validateInvariants(incentive);

    // 执行拒绝
    incentive.reject(reason);

    // 后置条件验证
    this.ensure(
      incentive.getStatus() === IncentiveStatus.REJECTED,
      'Rejected incentive must be in rejected status',
      'rejectIncentive',
    );
  }

  /**
   * 支付执行的契约检查
   */
  static executePayment(
    incentive: Incentive,
    paymentMethod: PaymentMethod,
    transactionId: string,
  ): PaymentResult {
    // 记录原始状态
    const originalStatus = incentive.getStatus();
    const originalRewardAmount = incentive.getRewardAmount();

    // 前置条件验证
    this.require(
      incentive !== null && incentive !== undefined,
      'Incentive is required for payment',
      'executePayment',
    );
    this.require(
      originalStatus === IncentiveStatus.APPROVED,
      'Only approved incentives can be paid',
      'executePayment',
    );
    this.require(
      Object.values(PaymentMethod).includes(paymentMethod),
      'Valid payment method is required',
      'executePayment',
    );
    this.require(
      !!(transactionId && transactionId.trim().length > 0),
      'Transaction ID is required for payment',
      'executePayment',
    );
    this.require(
      originalRewardAmount > 0,
      'Incentive must have positive reward amount',
      'executePayment',
    );

    // 验证支付资格
    const eligibility = IncentiveRules.canPayIncentive(incentive);
    this.require(
      eligibility.isEligible,
      `Incentive not eligible for payment: ${eligibility.errors.join(', ')}`,
      'executePayment',
    );

    // 验证不变式
    this.validateInvariants(incentive);

    // 执行支付
    const result = incentive.executePayment(paymentMethod, transactionId);

    // 后置条件验证
    this.ensure(
      result !== null && result !== undefined,
      'Payment execution must return a result',
      'executePayment',
    );
    this.ensure(
      typeof result.success === 'boolean',
      'Payment result must have boolean success flag',
      'executePayment',
    );

    if (result.success) {
      this.ensure(
        incentive.getStatus() === IncentiveStatus.PAID,
        'Successful payment must set status to paid',
        'executePayment',
      );
      this.ensure(
        result.transactionId === transactionId,
        'Payment result must contain correct transaction ID',
        'executePayment',
      );
      this.ensure(
        result.amount === originalRewardAmount,
        'Payment result must contain correct amount',
        'executePayment',
      );
    } else {
      this.ensure(
        incentive.getStatus() === originalStatus,
        'Failed payment must not change incentive status',
        'executePayment',
      );
      this.ensure(
        !!(result.error && result.error.length > 0),
        'Failed payment must have error message',
        'executePayment',
      );
    }

    return result;
  }

  /**
   * 激励系统不变式验证
   */
  static validateInvariants(incentive: Incentive): void {
    // 基本属性不变式
    this.invariant(
      incentive.getId() !== null && incentive.getId() !== undefined,
      'Incentive must always have a valid ID',
      'Incentive',
    );
    this.invariant(
      !!(incentive.getRecipientIP() && incentive.getRecipientIP().length > 0),
      'Incentive must always have a recipient IP',
      'Incentive',
    );
    this.invariant(
      incentive.getRewardAmount() >= 0,
      'Incentive reward amount must never be negative',
      'Incentive',
    );
    this.invariant(
      Object.values(IncentiveStatus).includes(incentive.getStatus()),
      'Incentive must always have a valid status',
      'Incentive',
    );
    this.invariant(
      incentive.getCreatedAt() instanceof Date,
      'Incentive must always have a valid creation date',
      'Incentive',
    );

    // 状态转换不变式
    const status = incentive.getStatus();
    if (status === IncentiveStatus.PAID) {
      this.invariant(
        incentive.getRewardAmount() > 0,
        'Paid incentive must have positive reward amount',
        'Incentive',
      );
    }

    if (
      status === IncentiveStatus.REJECTED ||
      status === IncentiveStatus.EXPIRED
    ) {
      // 拒绝或过期的激励不应该有支付信息
      // 这里可以添加更多特定状态的不变式
    }

    // 业务规则不变式
    this.invariant(
      incentive.getRewardAmount() <= IncentiveRules.MAX_REWARD_AMOUNT,
      `Incentive reward amount must not exceed maximum (${IncentiveRules.MAX_REWARD_AMOUNT})`,
      'Incentive',
    );

    // 时间相关不变式
    const now = new Date();
    this.invariant(
      incentive.getCreatedAt() <= now,
      'Incentive creation date must not be in the future',
      'Incentive',
    );

    // IP地址格式不变式
    this.invariant(
      this.isValidIPAddress(incentive.getRecipientIP()),
      'Incentive recipient IP must be valid IPv4 address',
      'Incentive',
    );
  }

  /**
   * 批量操作的契约验证
   */
  static validateBatchOperation<T>(
    items: T[],
    maxBatchSize: number,
    operationName: string,
  ): void {
    this.require(
      Array.isArray(items),
      `${operationName} requires an array of items`,
      operationName,
    );
    this.require(
      items.length > 0,
      `${operationName} requires at least one item`,
      operationName,
    );
    this.require(
      items.length <= maxBatchSize,
      `${operationName} batch size cannot exceed ${maxBatchSize}`,
      operationName,
    );
  }

  /**
   * 支付方式兼容性验证
   */
  static validatePaymentCompatibility(
    paymentMethod: PaymentMethod,
    contactInfo: ContactInfo,
  ): void {
    this.require(
      Object.values(PaymentMethod).includes(paymentMethod),
      'Valid payment method is required',
      'validatePaymentCompatibility',
    );
    this.require(
      contactInfo && contactInfo.isValid(),
      'Valid contact information is required',
      'validatePaymentCompatibility',
    );

    const validation = IncentiveRules.validatePaymentMethodCompatibility(
      paymentMethod,
      contactInfo,
    );
    this.require(
      validation.isValid,
      `Payment method incompatible with contact info: ${validation.errors.join(', ')}`,
      'validatePaymentCompatibility',
    );
  }

  /**
   * 性能契约验证
   */
  static performanceContract<T>(
    operation: () => T,
    maxExecutionTimeMs: number,
    operationName: string,
  ): T {
    const startTime = Date.now();

    try {
      const result = operation();
      const executionTime = Date.now() - startTime;

      this.ensure(
        executionTime <= maxExecutionTimeMs,
        `${operationName} exceeded maximum execution time: ${executionTime}ms > ${maxExecutionTimeMs}ms`,
        operationName,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.warn(`${operationName} failed after ${executionTime}ms:`, error);
      throw error;
    }
  }

  // 私有辅助方法
  private static require(
    condition: boolean,
    message: string,
    operation: string,
  ): void {
    if (!condition) {
      throw new IncentiveContractViolation(
        `Precondition failed in ${operation}: ${message}`,
      );
    }
  }

  private static ensure(
    condition: boolean,
    message: string,
    operation: string,
  ): void {
    if (!condition) {
      throw new IncentiveContractViolation(
        `Postcondition failed in ${operation}: ${message}`,
      );
    }
  }

  private static invariant(
    condition: boolean,
    message: string,
    entity: string,
  ): void {
    if (!condition) {
      throw new IncentiveContractViolation(
        `Invariant violated in ${entity}: ${message}`,
      );
    }
  }

  private static requireValidIP(ip: string, operation: string): void {
    this.require(
      !!(ip && typeof ip === 'string' && ip.trim().length > 0),
      'IP address is required',
      operation,
    );
    this.require(
      this.isValidIPAddress(ip),
      'IP address must be valid IPv4 format',
      operation,
    );
  }

  private static isValidIPAddress(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return false;
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }
}

/**
 * 激励系统契约违反异常
 */
export class IncentiveContractViolation extends Error {
  /**
   * Initializes a new instance of the Incentive Contract Violation.
   * @param message - The message.
   */
  constructor(message: string) {
    super(message);
    this.name = 'IncentiveContractViolation';
  }
}

/**
 * 激励系统设计契约装饰器
 */
export function requireValidIncentive(
  _target: any,
  propertyName: string,
  descriptor: PropertyDescriptor,
) {
  const method = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const incentive = args[0];
    if (!incentive) {
      throw new IncentiveContractViolation(
        `Method ${propertyName} requires a valid incentive as first argument`,
      );
    }

    IncentiveContracts.validateInvariants(incentive);
    return method.apply(this, args);
  };
}

/**
 * 支付操作契约装饰器
 */
export function requireApprovedIncentive(
  _target: any,
  propertyName: string,
  descriptor: PropertyDescriptor,
) {
  const method = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const incentive = args[0];
    if (!incentive || incentive.getStatus() !== IncentiveStatus.APPROVED) {
      throw new IncentiveContractViolation(
        `Method ${propertyName} requires an approved incentive`,
      );
    }

    return method.apply(this, args);
  };
}

/**
 * 性能监控契约装饰器
 */
export function monitorPerformance(maxTimeMs: number) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return IncentiveContracts.performanceContract(
        () => method.apply(this, args),
        maxTimeMs,
        `${target.constructor.name}.${propertyName}`,
      );
    };
  };
}
