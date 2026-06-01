import type { PaymentMethod } from '../../aggregates/incentive.aggregate.js';
import { Currency } from '../../aggregates/incentive.aggregate.js';
import type { ContactInfo } from '../../value-objects/index.js';
import type {
  BatchPaymentItem,
  IAuditLogger,
  IDomainEventBus,
  IIncentiveRepository,
  IPaymentGateway,
} from '../../../application/dtos/incentive.dto.js';
import {
  BatchPaymentResult,
  PaymentProcessingResult,
} from '../../../application/dtos/incentive.dto.js';
import { IncentiveRules } from '../incentive.rules.js';
import { IncentiveDomainHelpers } from './incentive-domain.helpers.js';

export class IncentivePaymentService {
  constructor(
    private readonly repository: IIncentiveRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly auditLogger: IAuditLogger,
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  public async processPayment(
    incentiveId: string,
    paymentMethod: PaymentMethod,
    contactInfo?: ContactInfo,
  ): Promise<PaymentProcessingResult> {
    try {
      const incentive = await this.repository.findById(incentiveId);
      if (!incentive) {
        return PaymentProcessingResult.failed(['Incentive not found']);
      }

      const eligibility = IncentiveRules.canPayIncentive(incentive);
      if (!eligibility.isEligible) {
        return PaymentProcessingResult.failed(eligibility.errors);
      }

      const actualContactInfo =
        contactInfo ||
        IncentiveDomainHelpers.extractContactInfoFromIncentive(incentive);
      const methodValidation =
        IncentiveRules.validatePaymentMethodCompatibility(
          paymentMethod,
          actualContactInfo,
        );
      if (!methodValidation.isValid) {
        return PaymentProcessingResult.failed(methodValidation.errors);
      }

      const gatewayResult = await this.paymentGateway.processPayment({
        amount: incentive.getRewardAmount(),
        currency: Currency.CNY,
        paymentMethod,
        recipientInfo:
          IncentiveDomainHelpers.buildRecipientInfo(actualContactInfo),
        reference: incentiveId,
      });

      if (!gatewayResult.success) {
        return PaymentProcessingResult.failed([
          gatewayResult.error ?? 'Payment gateway error',
        ]);
      }

      const paymentResult = incentive.executePayment(
        paymentMethod,
        gatewayResult.transactionId,
      );

      if (paymentResult.success) {
        await this.repository.save(incentive);
        await IncentiveDomainHelpers.publishEvents(incentive, this.eventBus);
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
      }

      await this.auditLogger.logBusinessEvent('INCENTIVE_PAYMENT_FAILED', {
        incentiveId,
        error: paymentResult.error,
        paymentMethod,
      });

      return PaymentProcessingResult.failed([
        paymentResult.error ?? 'Unknown payment error',
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('PROCESS_PAYMENT_ERROR', {
        incentiveId,
        paymentMethod,
        error: errorMessage,
      });
      console.error('Error processing payment:', error);
      return PaymentProcessingResult.failed([
        'Internal error occurred while processing payment',
      ]);
    }
  }

  public async processBatchPayment(
    incentiveIds: string[],
    paymentMethod: PaymentMethod,
  ): Promise<BatchPaymentResult> {
    try {
      const incentives = await this.repository.findByIds(incentiveIds);
      if (incentives.length === 0) {
        return BatchPaymentResult.failed(['No valid incentives found']);
      }

      const batchValidation = IncentiveRules.validateBatchPayment(incentives);
      if (!batchValidation.isValid) {
        return BatchPaymentResult.failed(batchValidation.errors);
      }

      const results: BatchPaymentItem[] = [];
      let successCount = 0;
      let totalPaidAmount = 0;

      for (const incentive of incentives) {
        const eligibility = IncentiveRules.canPayIncentive(incentive);
        if (!eligibility.isEligible) {
          results.push({
            incentiveId: incentive.getId().getValue(),
            success: false,
            error: eligibility.errors.join(', '),
          });
          continue;
        }

        try {
          const contactInfo =
            IncentiveDomainHelpers.extractContactInfoFromIncentive(incentive);
          const gatewayResult = await this.paymentGateway.processPayment(
            IncentiveDomainHelpers.createPaymentRequest(
              incentive,
              paymentMethod,
              contactInfo,
            ),
          );
          const paymentResult = incentive.executePayment(
            paymentMethod,
            gatewayResult.transactionId,
          );

          if (paymentResult.success) {
            await this.repository.save(incentive);
            await IncentiveDomainHelpers.publishEvents(
              incentive,
              this.eventBus,
            );
            results.push({
              incentiveId: incentive.getId().getValue(),
              success: true,
              transactionId: gatewayResult.transactionId,
              amount: paymentResult.amount ?? 0,
            });
            successCount++;
            totalPaidAmount += paymentResult.amount ?? 0;
          } else {
            results.push({
              incentiveId: incentive.getId().getValue(),
              success: false,
              error: paymentResult.error ?? 'Unknown error',
            });
          }
        } catch (paymentError) {
          const errorMessage =
            paymentError instanceof Error
              ? paymentError.message
              : 'Payment error';
          results.push({
            incentiveId: incentive.getId().getValue(),
            success: false,
            error: errorMessage,
          });
        }
      }

      await this.auditLogger.logBusinessEvent('BATCH_PAYMENT_PROCESSED', {
        totalIncentives: incentiveIds.length,
        successCount,
        failureCount: incentiveIds.length - successCount,
        totalPaidAmount,
        paymentMethod,
      });

      return BatchPaymentResult.success({
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
      return BatchPaymentResult.failed([
        'Internal error occurred while processing batch payment',
      ]);
    }
  }
}
