import { Currency } from '../aggregates/incentive.aggregate.js';

/**
 * Represents the payment result.
 */
export class PaymentResult {
  private constructor(
    public readonly success: boolean,
    public readonly transactionId?: string,
    public readonly amount?: number,
    public readonly currency?: Currency,
    public readonly error?: string
  ) {}

  /**
   * Performs the success operation.
   * @param transactionId - The transaction id.
   * @param amount - The amount.
   * @param currency - The currency.
   * @returns The PaymentResult.
   */
  static success(transactionId: string, amount: number, currency: Currency): PaymentResult {
    return new PaymentResult(true, transactionId, amount, currency);
  }

  /**
   * Performs the failed operation.
   * @param error - The error.
   * @returns The PaymentResult.
   */
  static failed(error: string): PaymentResult {
    return new PaymentResult(false, undefined, undefined, undefined, error);
  }
}
