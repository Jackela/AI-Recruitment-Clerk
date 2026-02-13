import type {
  IncentiveSummary,
  PaymentMethod,
} from './incentive.dto';
import type {
  IncentiveStatus,
  Currency,
} from './incentive.dto';
import type {
  IncentivePriority,
} from './incentive.rules';

/**
 * Represents the result of an incentive creation operation.
 */
export class IncentiveCreationResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: IncentiveSummary,
    public readonly errors?: string[],
  ) {}

  /**
   * Creates a successful result.
   * @param data - The incentive summary data.
   * @returns The IncentiveCreationResult.
   */
  public static success(data: IncentiveSummary): IncentiveCreationResult {
    return new IncentiveCreationResult(true, data);
  }

  /**
   * Creates a failed result.
   * @param errors - The error messages.
   * @returns The IncentiveCreationResult.
   */
  public static failed(errors: string[]): IncentiveCreationResult {
    return new IncentiveCreationResult(false, undefined, errors);
  }
}

/**
 * Represents the result of an incentive validation operation.
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
    public readonly errors?: string[],
  ) {}

  /**
   * Creates a successful result.
   * @param data - The validation data.
   * @returns The IncentiveValidationResult.
   */
  public static success(data: {
    incentiveId: string;
    isValid: boolean;
    errors: string[];
    status: IncentiveStatus;
  }): IncentiveValidationResult {
    return new IncentiveValidationResult(true, data);
  }

  /**
   * Creates a failed result.
   * @param errors - The error messages.
   * @returns The IncentiveValidationResult.
   */
  public static failed(errors: string[]): IncentiveValidationResult {
    return new IncentiveValidationResult(false, undefined, errors);
  }
}

/**
 * Represents the result of an incentive approval operation.
 */
export class IncentiveApprovalResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      incentiveId: string;
      status: IncentiveStatus;
      rewardAmount: number;
    },
    public readonly errors?: string[],
  ) {}

  /**
   * Creates a successful result.
   * @param data - The approval data.
   * @returns The IncentiveApprovalResult.
   */
  public static success(data: {
    incentiveId: string;
    status: IncentiveStatus;
    rewardAmount: number;
  }): IncentiveApprovalResult {
    return new IncentiveApprovalResult(true, data);
  }

  /**
   * Creates a failed result.
   * @param errors - The error messages.
   * @returns The IncentiveApprovalResult.
   */
  public static failed(errors: string[]): IncentiveApprovalResult {
    return new IncentiveApprovalResult(false, undefined, errors);
  }
}

/**
 * Represents the result of an incentive rejection operation.
 */
export class IncentiveRejectionResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      incentiveId: string;
      status: IncentiveStatus;
      rejectionReason: string;
    },
    public readonly errors?: string[],
  ) {}

  /**
   * Creates a successful result.
   * @param data - The rejection data.
   * @returns The IncentiveRejectionResult.
   */
  public static success(data: {
    incentiveId: string;
    status: IncentiveStatus;
    rejectionReason: string;
  }): IncentiveRejectionResult {
    return new IncentiveRejectionResult(true, data);
  }

  /**
   * Creates a failed result.
   * @param errors - The error messages.
   * @returns The IncentiveRejectionResult.
   */
  public static failed(errors: string[]): IncentiveRejectionResult {
    return new IncentiveRejectionResult(false, undefined, errors);
  }
}

/**
 * Represents the result of a payment processing operation.
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
    public readonly errors?: string[],
  ) {}

  /**
   * Creates a successful result.
   * @param data - The payment data.
   * @returns The PaymentProcessingResult.
   */
  public static success(data: {
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
   * Creates a failed result.
   * @param errors - The error messages.
   * @returns The PaymentProcessingResult.
   */
  public static failed(errors: string[]): PaymentProcessingResult {
    return new PaymentProcessingResult(false, undefined, errors);
  }
}

/**
 * Represents the result of a batch payment operation.
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
    public readonly errors?: string[],
  ) {}

  /**
   * Creates a successful result.
   * @param data - The batch payment data.
   * @returns The BatchPaymentResult.
   */
  public static success(data: {
    totalIncentives: number;
    successCount: number;
    failureCount: number;
    totalPaidAmount: number;
    results: BatchPaymentItem[];
  }): BatchPaymentResult {
    return new BatchPaymentResult(true, data);
  }

  /**
   * Creates a failed result.
   * @param errors - The error messages.
   * @returns The BatchPaymentResult.
   */
  public static failed(errors: string[]): BatchPaymentResult {
    return new BatchPaymentResult(false, undefined, errors);
  }
}

/**
 * Represents the result of an incentive statistics query.
 */
export class IncentiveStatsResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      individual?: IPIncentiveStatistics;
      system?: SystemIncentiveStatistics;
    },
    public readonly errors?: string[],
  ) {}

  /**
   * Creates a successful result.
   * @param data - The statistics data.
   * @returns The IncentiveStatsResult.
   */
  public static success(data: {
    individual?: IPIncentiveStatistics;
    system?: SystemIncentiveStatistics;
  }): IncentiveStatsResult {
    return new IncentiveStatsResult(true, data);
  }

  /**
   * Creates a failed result.
   * @param errors - The error messages.
   * @returns The IncentiveStatsResult.
   */
  public static failed(errors: string[]): IncentiveStatsResult {
    return new IncentiveStatsResult(false, undefined, errors);
  }
}

/**
 * Represents the result of a pending incentives query.
 */
export class PendingIncentivesResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: Array<{
      incentive: IncentiveSummary;
      priority: IncentivePriority;
    }>,
    public readonly errors?: string[],
  ) {}

  /**
   * Creates a successful result.
   * @param data - The pending incentives data.
   * @returns The PendingIncentivesResult.
   */
  public static success(
    data: Array<{
      incentive: IncentiveSummary;
      priority: IncentivePriority;
    }>,
  ): PendingIncentivesResult {
    return new PendingIncentivesResult(true, data);
  }

  /**
   * Creates a failed result.
   * @param errors - The error messages.
   * @returns The PendingIncentivesResult.
   */
  public static failed(errors: string[]): PendingIncentivesResult {
    return new PendingIncentivesResult(false, undefined, errors);
  }
}

/**
 * Represents a single item in a batch payment result.
 */
export interface BatchPaymentItem {
  incentiveId: string;
  success: boolean;
  transactionId?: string;
  amount?: number;
  error?: string;
}

/**
 * IP-based incentive statistics.
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
 * System-wide incentive statistics.
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

/**
 * Payment gateway request interface.
 */
export interface PaymentGatewayRequest {
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  recipientInfo: ContactInfo;
  reference: string;
}

/**
 * Payment gateway response interface.
 */
export interface PaymentGatewayResponse {
  success: boolean;
  transactionId: string;
  error?: string;
}

/**
 * Contact information for payments.
 */
export interface ContactInfo {
  email?: string;
  wechat?: string;
  alipay?: string;
}
