import {
  IncentiveSummary,
  IncentiveStatus,
  Currency,
  PaymentMethod
} from '../../domain/aggregates/incentive.aggregate.js';
import { IncentivePriority } from '../../domain/domain-services/incentive.rules.js';

// Application layer DTOs and result classes

// 结果类定义
export class IncentiveCreationResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: IncentiveSummary,
    public readonly errors?: string[]
  ) {}

  static success(data: IncentiveSummary): IncentiveCreationResult {
    return new IncentiveCreationResult(true, data);
  }

  static failed(errors: string[]): IncentiveCreationResult {
    return new IncentiveCreationResult(false, undefined, errors);
  }
}

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

  static success(data: {
    incentiveId: string;
    isValid: boolean;
    errors: string[];
    status: IncentiveStatus;
  }): IncentiveValidationResult {
    return new IncentiveValidationResult(true, data);
  }

  static failed(errors: string[]): IncentiveValidationResult {
    return new IncentiveValidationResult(false, undefined, errors);
  }
}

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

  static success(data: {
    incentiveId: string;
    status: IncentiveStatus;
    rewardAmount: number;
  }): IncentiveApprovalResult {
    return new IncentiveApprovalResult(true, data);
  }

  static failed(errors: string[]): IncentiveApprovalResult {
    return new IncentiveApprovalResult(false, undefined, errors);
  }
}

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

  static success(data: {
    incentiveId: string;
    status: IncentiveStatus;
    rejectionReason: string;
  }): IncentiveRejectionResult {
    return new IncentiveRejectionResult(true, data);
  }

  static failed(errors: string[]): IncentiveRejectionResult {
    return new IncentiveRejectionResult(false, undefined, errors);
  }
}

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

  static failed(errors: string[]): PaymentProcessingResult {
    return new PaymentProcessingResult(false, undefined, errors);
  }
}

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

  static success(data: {
    totalIncentives: number;
    successCount: number;
    failureCount: number;
    totalPaidAmount: number;
    results: BatchPaymentItem[];
  }): BatchPaymentResult {
    return new BatchPaymentResult(true, data);
  }

  static failed(errors: string[]): BatchPaymentResult {
    return new BatchPaymentResult(false, undefined, errors);
  }
}

export class IncentiveStatsResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      individual?: IPIncentiveStatistics;
      system?: SystemIncentiveStatistics;
    },
    public readonly errors?: string[]
  ) {}

  static success(data: {
    individual?: IPIncentiveStatistics;
    system?: SystemIncentiveStatistics;
  }): IncentiveStatsResult {
    return new IncentiveStatsResult(true, data);
  }

  static failed(errors: string[]): IncentiveStatsResult {
    return new IncentiveStatsResult(false, undefined, errors);
  }
}

export class PendingIncentivesResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: Array<{
      incentive: IncentiveSummary;
      priority: IncentivePriority;
    }>,
    public readonly errors?: string[]
  ) {}

  static success(data: Array<{
    incentive: IncentiveSummary;
    priority: IncentivePriority;
  }>): PendingIncentivesResult {
    return new PendingIncentivesResult(true, data);
  }

  static failed(errors: string[]): PendingIncentivesResult {
    return new PendingIncentivesResult(false, undefined, errors);
  }
}

// 接口定义
export interface BatchPaymentItem {
  incentiveId: string;
  success: boolean;
  transactionId?: string;
  amount?: number;
  error?: string;
}

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

export interface PaymentGatewayRequest {
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  recipientInfo: any;
  reference: string;
}

export interface PaymentGatewayResponse {
  success: boolean;
  transactionId: string;
  error?: string;
}

// 仓储接口定义
export interface IIncentiveRepository {
  save(incentive: any): Promise<void>;
  findById(id: string): Promise<any | null>;
  findByIds(ids: string[]): Promise<any[]>;
  findByIP(ip: string, timeRange?: { startDate: Date; endDate: Date }): Promise<any[]>;
  findAll(timeRange?: { startDate: Date; endDate: Date }): Promise<any[]>;
  findPendingIncentives(status?: IncentiveStatus, limit?: number): Promise<any[]>;
  findReferralIncentive(referrerIP: string, referredIP: string): Promise<any | null>;
  countTodayIncentives(ip: string): Promise<number>;
  deleteExpired(olderThanDays: number): Promise<number>;
}

export interface IDomainEventBus {
  publish(event: any): Promise<void>;
}

export interface IAuditLogger {
  logBusinessEvent(eventType: string, data: any): Promise<void>;
  logSecurityEvent(eventType: string, data: any): Promise<void>;
  logError(eventType: string, data: any): Promise<void>;
}

export interface IPaymentGateway {
  processPayment(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse>;
}
