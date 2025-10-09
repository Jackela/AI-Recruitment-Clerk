import {
  Incentive,
  IncentiveStatus,
  Currency,
  PaymentMethod
} from '../../domain/aggregates/incentive.aggregate.js';
import { IncentiveSummary } from '../../domain/value-objects/index.js';
import { IncentivePriority } from '../../domain/domain-services/incentive.rules.js';

// Application layer DTOs and result classes

// 结果类定义
/**
 * Represents the incentive creation result.
 */
export class IncentiveCreationResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: IncentiveSummary,
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The IncentiveCreationResult.
   */
  static success(data: IncentiveSummary): IncentiveCreationResult {
    return new IncentiveCreationResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The IncentiveCreationResult.
   */
  static failed(errors: string[]): IncentiveCreationResult {
    return new IncentiveCreationResult(false, undefined, errors);
  }
}

/**
 * Represents the incentive validation result.
 */
export class IncentiveValidationResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      incentiveId: string;
      isValid: boolean;
      errors: string[];
      status: IncentiveStatus;
    },
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The IncentiveValidationResult.
   */
  static success(data: {
    incentiveId: string;
    isValid: boolean;
    errors: string[];
    status: IncentiveStatus;
  }): IncentiveValidationResult {
    return new IncentiveValidationResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The IncentiveValidationResult.
   */
  static failed(errors: string[]): IncentiveValidationResult {
    return new IncentiveValidationResult(false, undefined, errors);
  }
}

/**
 * Represents the incentive approval result.
 */
export class IncentiveApprovalResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      incentiveId: string;
      status: IncentiveStatus;
      rewardAmount: number;
    },
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The IncentiveApprovalResult.
   */
  static success(data: {
    incentiveId: string;
    status: IncentiveStatus;
    rewardAmount: number;
  }): IncentiveApprovalResult {
    return new IncentiveApprovalResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The IncentiveApprovalResult.
   */
  static failed(errors: string[]): IncentiveApprovalResult {
    return new IncentiveApprovalResult(false, undefined, errors);
  }
}

/**
 * Represents the incentive rejection result.
 */
export class IncentiveRejectionResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      incentiveId: string;
      status: IncentiveStatus;
      rejectionReason: string;
    },
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The IncentiveRejectionResult.
   */
  static success(data: {
    incentiveId: string;
    status: IncentiveStatus;
    rejectionReason: string;
  }): IncentiveRejectionResult {
    return new IncentiveRejectionResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The IncentiveRejectionResult.
   */
  static failed(errors: string[]): IncentiveRejectionResult {
    return new IncentiveRejectionResult(false, undefined, errors);
  }
}

/**
 * Represents the payment processing result.
 */
export class PaymentProcessingResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      incentiveId: string;
      transactionId: string;
      amount: number;
      currency: Currency;
      paymentMethod: PaymentMethod;
      status: IncentiveStatus;
    },
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The PaymentProcessingResult.
   */
  static success(data: {
    incentiveId: string;
    transactionId: string;
    amount: number;
    currency: Currency;
    paymentMethod: PaymentMethod;
    status: IncentiveStatus;
  }): PaymentProcessingResult {
    return new PaymentProcessingResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The PaymentProcessingResult.
   */
  static failed(errors: string[]): PaymentProcessingResult {
    return new PaymentProcessingResult(false, undefined, errors);
  }
}

/**
 * Represents the batch payment result.
 */
export class BatchPaymentResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      totalIncentives: number;
      successCount: number;
      failureCount: number;
      totalPaidAmount: number;
      results: BatchPaymentItem[];
    },
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The BatchPaymentResult.
   */
  static success(data: {
    totalIncentives: number;
    successCount: number;
    failureCount: number;
    totalPaidAmount: number;
    results: BatchPaymentItem[];
  }): BatchPaymentResult {
    return new BatchPaymentResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The BatchPaymentResult.
   */
  static failed(errors: string[]): BatchPaymentResult {
    return new BatchPaymentResult(false, undefined, errors);
  }
}

/**
 * Represents the incentive stats result.
 */
export class IncentiveStatsResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      individual?: IPIncentiveStatistics;
      system?: SystemIncentiveStatistics;
    },
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The IncentiveStatsResult.
   */
  static success(data: {
    individual?: IPIncentiveStatistics;
    system?: SystemIncentiveStatistics;
  }): IncentiveStatsResult {
    return new IncentiveStatsResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The IncentiveStatsResult.
   */
  static failed(errors: string[]): IncentiveStatsResult {
    return new IncentiveStatsResult(false, undefined, errors);
  }
}

/**
 * Represents the pending incentives result.
 */
export class PendingIncentivesResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: Array<{
      incentive: IncentiveSummary;
      priority: IncentivePriority;
    }>,
    public readonly errors?: string[]
  ) {}

  /**
   * Performs the success operation.
   * @param data - The data.
   * @returns The PendingIncentivesResult.
   */
  static success(data: Array<{
    incentive: IncentiveSummary;
    priority: IncentivePriority;
  }>): PendingIncentivesResult {
    return new PendingIncentivesResult(true, data);
  }

  /**
   * Performs the failed operation.
   * @param errors - The errors.
   * @returns The PendingIncentivesResult.
   */
  static failed(errors: string[]): PendingIncentivesResult {
    return new PendingIncentivesResult(false, undefined, errors);
  }
}

// 接口定义
/**
 * Defines the shape of the batch payment item.
 */
export interface BatchPaymentItem {
  incentiveId: string;
  success: boolean;
  transactionId?: string;
  amount?: number;
  error?: string;
}

/**
 * Defines the shape of the ip incentive statistics.
 */
export interface IPIncentiveStatistics {
  ip: string;
  totalIncentives: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  statusBreakdown: {
    pending: number;
    approved: number;
    paid: number;
    rejected: number;
  };
  averageReward: number;
  lastIncentiveDate?: number;
}

/**
 * Defines the shape of the system incentive statistics.
 */
export interface SystemIncentiveStatistics {
  totalIncentives: number;
  uniqueRecipients: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  statusBreakdown: {
    pending: number;
    approved: number;
    paid: number;
    rejected: number;
  };
  averageRewardPerIncentive: number;
  averageRewardPerIP: number;
  conversionRate: number;
}

// Type definitions for payment processing
/**
 * Defines the shape of the recipient info.
 */
export interface RecipientInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  accountNumber?: string;
  bankCode?: string;
  [key: string]: unknown;
}

/**
 * Defines the shape of the payment gateway request.
 */
export interface PaymentGatewayRequest {
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  recipientInfo: RecipientInfo;
  reference: string;
}

/**
 * Defines the shape of the payment gateway response.
 */
export interface PaymentGatewayResponse {
  success: boolean;
  transactionId: string;
  error?: string;
}

// Type definitions for repository operations
/**
 * Defines the shape of the incentive entity.
 */
/**
 * Represents a persisted incentive record.
 */
export type IncentiveEntity = Incentive;

/**
 * Defines the shape of the time range.
 */
export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

// 仓储接口定义
/**
 * Defines the shape of the i incentive repository.
 */
export interface IIncentiveRepository {
  save(incentive: IncentiveEntity): Promise<void>;
  findById(id: string): Promise<IncentiveEntity | null>;
  findByIds(ids: string[]): Promise<IncentiveEntity[]>;
  findByIP(ip: string, timeRange?: TimeRange): Promise<IncentiveEntity[]>;
  findAll(timeRange?: TimeRange): Promise<IncentiveEntity[]>;
  findPendingIncentives(status?: IncentiveStatus, limit?: number): Promise<IncentiveEntity[]>;
  findReferralIncentive(referrerIP: string, referredIP: string): Promise<IncentiveEntity | null>;
  countTodayIncentives(ip: string): Promise<number>;
  deleteExpired(olderThanDays: number): Promise<number>;
}

// Type definitions for domain events and audit logging
/**
 * Defines the shape of the domain event.
 */
export interface DomainEvent {
  occurredAt: Date;
}

/**
 * Defines the shape of the audit log data.
 */
export interface AuditLogData {
  [key: string]: unknown;
}

/**
 * Defines the shape of the i domain event bus.
 */
export interface IDomainEventBus {
  publish(event: DomainEvent): Promise<void>;
}

/**
 * Defines the shape of the i audit logger.
 */
export interface IAuditLogger {
  logBusinessEvent(eventType: string, data: AuditLogData): Promise<void>;
  logSecurityEvent(eventType: string, data: AuditLogData): Promise<void>;
  logError(eventType: string, data: AuditLogData): Promise<void>;
}

/**
 * Defines the shape of the i payment gateway.
 */
export interface IPaymentGateway {
  processPayment(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse>;
}
