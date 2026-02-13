import type {
  IncentiveSummary,
  PaymentMethod,
  ContactInfo,

  Incentive,
  IncentiveStatus} from './incentive.dto';
import {
  Currency,
} from './incentive.dto';
import { IncentiveRules } from './incentive.rules';
import type {
  PaymentGatewayRequest,
  PaymentGatewayResponse,
  BatchPaymentItem,
} from './incentive-results.types';
import type { IIncentiveRepository } from './incentive-service.interfaces';
import type { IDomainEventBus } from './incentive-service.interfaces';
import type { IAuditLogger } from './incentive-service.interfaces';
import type { IPaymentGateway } from './incentive-service.interfaces';
import type { IncentiveValidationService } from './incentive-validation.service';
import type { PaymentEligibilityResult, PaymentMethodValidationResult } from './incentive-validation.service';

/**
 * Handles incentive payment processing including single and batch payments.
 * Manages payment gateway interactions and payment execution.
 */
export class IncentivePaymentService {
  constructor(
    private readonly repository: IIncentiveRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly auditLogger: IAuditLogger,
    private readonly paymentGateway: IPaymentGateway,
    private readonly validationService: IncentiveValidationService,
  ) {}

  /**
   * Processes a single incentive payment.
   * @param incentiveId - The ID of the incentive to pay.
   * @param paymentMethod - The payment method to use.
   * @param contactInfo - Optional contact information (uses incentive's info if not provided).
   * @returns Payment processing result.
   */
  public async processPayment(
    incentiveId: string,
    paymentMethod: PaymentMethod,
    contactInfo?: ContactInfo,
  ): Promise<SinglePaymentResult> {
    try {
      const incentive = await this.repository.findById(incentiveId);
      if (!incentive) {
        return SinglePaymentResult.notFound(['Incentive not found']);
      }

      // Validate payment eligibility
      const eligibility = this.validationService.validatePaymentEligibility(incentive);
      if (!eligibility.isEligible) {
        return SinglePaymentResult.notEligible(eligibility.errors);
      }

      // Validate payment method compatibility
      const actualContactInfo =
        contactInfo || this.extractContactInfoFromIncentive(incentive);
      const methodValidation =
        this.validationService.validatePaymentMethodCompatibility(
          paymentMethod,
          actualContactInfo,
        );
      if (!methodValidation.isValid) {
        return SinglePaymentResult.methodInvalid(methodValidation.errors);
      }

      // Process payment through gateway
      const gatewayResult =
        await this.executeGatewayPayment(
          incentive.getRewardAmount(),
          paymentMethod,
          actualContactInfo,
          incentiveId,
        );

      // Execute incentive payment
      const paymentResult = incentive.executePayment(
        paymentMethod,
        gatewayResult.transactionId,
      );

      if (paymentResult.success) {
        await this.saveAndPublishEvents(incentive);

        await this.auditLogger.logBusinessEvent('INCENTIVE_PAID', {
          incentiveId,
          amount: paymentResult.amount,
          currency: paymentResult.currency,
          paymentMethod,
          transactionId: gatewayResult.transactionId,
        });

        return PaymentProcessingResult.success({
          incentiveId,
          transactionId: gatewayResult.transactionId,
          amount: paymentResult.amount ?? 0,
          currency: paymentResult.currency ?? Currency.CNY,
          paymentMethod,
          status: incentive.getStatus(),
        });
      } else {
        await this.auditLogger.logBusinessEvent('INCENTIVE_PAYMENT_FAILED', {
          incentiveId,
          error: paymentResult.error,
          paymentMethod,
        });

        return SinglePaymentResult.failed([paymentResult.error ?? 'Unknown error']);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('PROCESS_PAYMENT_ERROR', {
        incentiveId,
        paymentMethod,
        error: errorMessage,
      });
      console.error('Error processing payment:', error);
      return SinglePaymentResult.failed([
        'Internal error occurred while processing payment',
      ]);
    }
  }

  /**
   * Processes batch payments for multiple incentives.
   * @param incentiveIds - Array of incentive IDs to pay.
   * @param paymentMethod - The payment method to use for all payments.
   * @returns Batch payment result with individual item results.
   */
  public async processBatchPayment(
    incentiveIds: string[],
    paymentMethod: PaymentMethod,
  ): Promise<BatchPaymentExecutionResult> {
    try {
      // Get all incentives
      const incentives = await this.repository.findByIds(incentiveIds);
      if (incentives.length === 0) {
        return BatchPaymentExecutionResult.failed(['No valid incentives found']);
      }

      // Validate batch payment
      const batchValidation =
        this.validationService.validateBatchPayment(incentives);
      if (!batchValidation.isValid) {
        return BatchPaymentExecutionResult.failed(batchValidation.errors);
      }

      // Process each incentive's payment
      const results: BatchPaymentItem[] = [];
      let successCount = 0;
      let totalPaidAmount = 0;

      for (const incentive of incentives) {
        const eligibility = this.validationService.validatePaymentEligibility(incentive);
        if (!eligibility.isEligible) {
          results.push({
            incentiveId: incentive.getId().getValue(),
            success: false,
            error: eligibility.errors.join(', '),
          });
          continue;
        }

        const itemResult = await this.processBatchItem(
          incentive,
          paymentMethod,
        );

        results.push(itemResult);

        if (itemResult.success) {
          successCount++;
          totalPaidAmount += itemResult.amount ?? 0;
        }
      }

      await this.auditLogger.logBusinessEvent('BATCH_PAYMENT_PROCESSED', {
        totalIncentives: incentiveIds.length,
        successCount,
        failureCount: incentiveIds.length - successCount,
        totalPaidAmount,
        paymentMethod,
      });

      return BatchPaymentExecutionResult.success({
        totalIncentives: incentiveIds.length,
        successCount,
        failureCount: incentiveIds.length - successCount,
        totalPaidAmount,
        results,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('PROCESS_BATCH_PAYMENT_ERROR', {
        incentiveIds,
        paymentMethod,
        error: errorMessage,
      });
      console.error('Error processing batch payment:', error);
      return BatchPaymentExecutionResult.failed([
        'Internal error occurred while processing batch payment',
      ]);
    }
  }

  /**
   * Processes a single item in a batch payment.
   * @param incentive - The incentive to pay.
   * @param paymentMethod - The payment method to use.
   * @returns Batch payment item result.
   */
  private async processBatchItem(
    incentive: Incentive,
    paymentMethod: PaymentMethod,
  ): Promise<BatchPaymentItem> {
    try {
      const contactInfo = this.extractContactInfoFromIncentive(incentive);

      const gatewayResult = await this.executeGatewayPayment(
        incentive.getRewardAmount(),
        paymentMethod,
        contactInfo,
        incentive.getId().getValue(),
      );

      const paymentResult = incentive.executePayment(
        paymentMethod,
        gatewayResult.transactionId,
      );

      if (paymentResult.success) {
        await this.repository.save(incentive);

        // Publish domain events
        const events = incentive.getUncommittedEvents();
        for (const event of events) {
          await this.eventBus.publish(event);
        }
        incentive.markEventsAsCommitted();

        return {
          incentiveId: incentive.getId().getValue(),
          success: true,
          transactionId: gatewayResult.transactionId,
          amount: paymentResult.amount ?? 0,
        };
      } else {
        return {
          incentiveId: incentive.getId().getValue(),
          success: false,
          error: paymentResult.error ?? 'Unknown error',
        };
      }
    } catch (paymentError) {
      const errorMessage =
        paymentError instanceof Error ? paymentError.message : 'Payment error';
      return {
        incentiveId: incentive.getId().getValue(),
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Executes payment through the payment gateway.
   * @param amount - The payment amount.
   * @param paymentMethod - The payment method.
   * @param contactInfo - The recipient contact information.
   * @param reference - The payment reference (incentive ID).
   * @returns Payment gateway response.
   */
  private async executeGatewayPayment(
    amount: number,
    paymentMethod: PaymentMethod,
    contactInfo: ContactInfo,
    reference: string,
  ): Promise<PaymentGatewayResponse> {
    const request: PaymentGatewayRequest = {
      amount,
      currency: Currency.CNY,
      paymentMethod,
      recipientInfo: contactInfo,
      reference,
    };

    return this.paymentGateway.processPayment(request);
  }

  /**
   * Saves incentive and publishes its domain events.
   * @param incentive - The incentive to save.
   */
  private async saveAndPublishEvents(incentive: Incentive): Promise<void> {
    await this.repository.save(incentive);

    const events = incentive.getUncommittedEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    incentive.markEventsAsCommitted();
  }

  /**
   * Extracts contact information from an incentive.
   * In production, this would retrieve actual contact info from the incentive.
   * @param _incentive - The incentive to extract contact info from.
   * @returns Contact information.
   */
  private extractContactInfoFromIncentive(_incentive: Incentive): ContactInfo {
    // Basic implementation for testing purposes
    return {
      email: 'test@example.com',
      wechat: 'test_wechat',
      alipay: 'test_alipay',
    };
  }
}

// Re-export PaymentProcessingResult and BatchPaymentResult for backward compatibility
export type { PaymentProcessingResult, BatchPaymentResult } from './incentive-results.types';

// Also export result classes for direct use
export { SinglePaymentResult, BatchPaymentExecutionResult };

/**
 * Result of a single payment operation.
 */
export class SinglePaymentResult {
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

  static success(data: {
    incentiveId: string;
    transactionId: string;
    amount: number;
    currency: Currency;
    paymentMethod: PaymentMethod;
    status: IncentiveStatus;
  }): SinglePaymentResult {
    return new SinglePaymentResult(true, data);
  }

  static notFound(errors: string[]): SinglePaymentResult {
    return new SinglePaymentResult(false, undefined, errors);
  }

  static notEligible(result: PaymentEligibilityResult): SinglePaymentResult {
    return new SinglePaymentResult(false, undefined, result.errors);
  }

  static methodInvalid(result: PaymentMethodValidationResult): SinglePaymentResult {
    return new SinglePaymentResult(false, undefined, result.errors);
  }

  static failed(errors: string[]): SinglePaymentResult {
    return new SinglePaymentResult(false, undefined, errors);
  }
}

/**
 * Result of a batch payment execution.
 */
export class BatchPaymentExecutionResult {
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

  static success(data: {
    totalIncentives: number;
    successCount: number;
    failureCount: number;
    totalPaidAmount: number;
    results: BatchPaymentItem[];
  }): BatchPaymentExecutionResult {
    return new BatchPaymentExecutionResult(true, data);
  }

  static failed(errors: string[]): BatchPaymentExecutionResult {
    return new BatchPaymentExecutionResult(false, undefined, errors);
  }
}

// Re-export PaymentProcessingResult and BatchPaymentResult for backward compatibility
export type { PaymentProcessingResult, BatchPaymentResult } from './incentive-results.types';
