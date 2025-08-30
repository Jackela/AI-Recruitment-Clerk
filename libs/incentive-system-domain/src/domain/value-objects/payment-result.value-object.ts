import { Currency } from '../aggregates/incentive.aggregate.js';

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
