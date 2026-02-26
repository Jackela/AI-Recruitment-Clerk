/**
 * Incentive system result classes.
 * Defines IncentiveValidationResult, PaymentResult, and IncentiveSummary.
 */

import { ValueObject } from '../../base/value-object';
import type { Currency, IncentiveStatus, TriggerType } from './incentive-enums';

// ============================================================================
// IncentiveValidationResult
// ============================================================================

/**
 * Represents the incentive validation result.
 */
export class IncentiveValidationResult {
  /**
   * Initializes a new instance of the Incentive Validation Result.
   * @param isValid - The is valid.
   * @param errors - The errors.
   */
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[],
  ) {}
}

// ============================================================================
// PaymentResult
// ============================================================================

/**
 * Represents the payment result.
 */
export class PaymentResult {
  private constructor(
    public readonly success: boolean,
    public readonly transactionId?: string,
    public readonly amount?: number,
    public readonly currency?: Currency,
    public readonly error?: string,
  ) {}

  /**
   * Performs the success operation.
   * @param transactionId - The transaction id.
   * @param amount - The amount.
   * @param currency - The currency.
   * @returns The PaymentResult.
   */
  public static success(
    transactionId: string,
    amount: number,
    currency: Currency,
  ): PaymentResult {
    return new PaymentResult(true, transactionId, amount, currency);
  }

  /**
   * Performs the failed operation.
   * @param error - The error.
   * @returns The PaymentResult.
   */
  public static failed(error: string): PaymentResult {
    return new PaymentResult(false, undefined, undefined, undefined, error);
  }
}

// ============================================================================
// IncentiveSummary
// ============================================================================

/**
 * Represents the incentive summary.
 */
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
  /**
   * Performs the id operation.
   * @returns The string value.
   */
  public get id(): string {
    return this.props.id;
  }
  /**
   * Performs the recipient ip operation.
   * @returns The string value.
   */
  public get recipientIP(): string {
    return this.props.recipientIP;
  }
  /**
   * Performs the reward amount operation.
   * @returns The number value.
   */
  public get rewardAmount(): number {
    return this.props.rewardAmount;
  }
  /**
   * Performs the status operation.
   * @returns The IncentiveStatus.
   */
  public get status(): IncentiveStatus {
    return this.props.status;
  }
  /**
   * Performs the can be paid operation.
   * @returns The boolean value.
   */
  public get canBePaid(): boolean {
    return this.props.canBePaid;
  }
  /**
   * Performs the days since creation operation.
   * @returns The number value.
   */
  public get daysSinceCreation(): number {
    return this.props.daysSinceCreation;
  }
}
