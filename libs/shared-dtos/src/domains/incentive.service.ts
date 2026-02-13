import type {
  IncentiveSummary,
  PaymentMethod,
  ContactInfo,

  IncentiveStatus} from './incentive.dto';
import {
  Incentive
} from './incentive.dto';

// Import extracted modules
import {
  IncentiveCreationResult,
  IncentiveValidationResult,
  IncentiveApprovalResult,
  IncentiveRejectionResult,
  IncentiveStatsResult,
  PendingIncentivesResult,
} from './incentive-results.types';
import type {
  IPIncentiveStatistics,
  SystemIncentiveStatistics,
} from './incentive-results.types';
import { IncentiveValidationService } from './incentive-validation.service';
import type { ReferralEligibilityResult } from './incentive-validation.service';
import { IncentiveCalculationsService } from './incentive-calculations.service';
import { IncentivePaymentService } from './incentive-payment.service';
import type {
  IIncentiveRepository,
  IDomainEventBus,
  IAuditLogger,
  IPaymentGateway,
} from './incentive-service.interfaces';
import { IncentiveRules } from './incentive.rules';

/**
 * Provides incentive domain functionality.
 * Acts as the main orchestrator for incentive operations.
 */
export class IncentiveDomainService {
  private readonly validationService: IncentiveValidationService;
  private readonly calculationsService: IncentiveCalculationsService;
  private readonly paymentService: IncentivePaymentService;

  /**
   * Initializes a new instance of Incentive Domain Service.
   * @param repository - The incentive repository.
   * @param eventBus - The domain event bus.
   * @param auditLogger - The audit logger.
   * @param paymentGateway - The payment gateway.
   */
  constructor(
    private readonly repository: IIncentiveRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly auditLogger: IAuditLogger,
    paymentGateway: IPaymentGateway,
  ) {
    this.validationService = new IncentiveValidationService(
      repository,
      auditLogger,
    );
    this.calculationsService = new IncentiveCalculationsService();
    this.paymentService = new IncentivePaymentService(
      repository,
      eventBus,
      auditLogger,
      paymentGateway,
      this.validationService,
    );
  }

  /**
   * Creates a questionnaire completion incentive.
   * @param ip - The requester's IP address.
   * @param questionnaireId - The questionnaire ID.
   * @param qualityScore - The quality score achieved.
   * @param contactInfo - Contact information for payment.
   * @returns Result of the incentive creation.
   */
  public async createQuestionnaireIncentive(
    ip: string,
    questionnaireId: string,
    qualityScore: number,
    contactInfo: ContactInfo,
  ): Promise<IncentiveCreationResult> {
    try {
      // Validate eligibility
      const eligibility =
        await this.validationService.validateQuestionnaireIncentiveCreation(
          ip,
          questionnaireId,
          qualityScore,
        );

      if (!eligibility.isEligible) {
        const errors = eligibility.errors ?? ['Unknown error'];
        return IncentiveCreationResult.failed(errors);
      }

      // Create and save incentive
      const incentive = Incentive.createQuestionnaireIncentive(
        ip,
        questionnaireId,
        qualityScore,
        contactInfo,
      );

      await this.repository.save(incentive);

      // Publish domain events
      await this.publishDomainEvents(incentive);

      await this.auditLogger.logBusinessEvent('INCENTIVE_CREATED', {
        incentiveId: incentive.getId().getValue(),
        ip,
        questionnaireId,
        qualityScore,
        rewardAmount: incentive.getRewardAmount(),
        status: incentive.getStatus(),
      });

      return IncentiveCreationResult.success(incentive.getIncentiveSummary());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('CREATE_QUESTIONNAIRE_INCENTIVE_ERROR', {
        ip,
        questionnaireId,
        qualityScore,
        error: errorMessage,
      });
      console.error('Error creating questionnaire incentive:', error);
      return IncentiveCreationResult.failed([
        'Internal error occurred while creating incentive',
      ]);
    }
  }

  /**
   * Creates a referral incentive.
   * @param referrerIP - The referrer's IP address.
   * @param referredIP - The referred person's IP address.
   * @param contactInfo - Contact information for payment.
   * @returns Result of the incentive creation.
   */
  public async createReferralIncentive(
    referrerIP: string,
    referredIP: string,
    contactInfo: ContactInfo,
  ): Promise<IncentiveCreationResult> {
    try {
      // Validate eligibility
      const eligibility =
        await this.validationService.validateReferralIncentiveCreation(
          referrerIP,
          referredIP,
        );

      if (!eligibility.isEligible) {
        const errors = eligibility.errors ?? ['Unknown error'];
        return IncentiveCreationResult.failed(errors);
      }

      // Create and save incentive
      const incentive = Incentive.createReferralIncentive(
        referrerIP,
        referredIP,
        contactInfo,
      );

      await this.repository.save(incentive);

      // Publish domain events
      await this.publishDomainEvents(incentive);

      await this.auditLogger.logBusinessEvent('REFERRAL_INCENTIVE_CREATED', {
        incentiveId: incentive.getId().getValue(),
        referrerIP,
        referredIP,
        rewardAmount: incentive.getRewardAmount(),
      });

      return IncentiveCreationResult.success(incentive.getIncentiveSummary());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('CREATE_REFERRAL_INCENTIVE_ERROR', {
        referrerIP,
        referredIP,
        error: errorMessage,
      });
      console.error('Error creating referral incentive:', error);
      return IncentiveCreationResult.failed([
        'Internal error occurred while creating referral incentive',
      ]);
    }
  }

  /**
   * Validates an incentive.
   * @param incentiveId - The ID of the incentive to validate.
   * @returns Result of the validation.
   */
  public async validateIncentive(
    incentiveId: string,
  ): Promise<IncentiveValidationResult> {
    try {
      const incentive = await this.repository.findById(incentiveId);
      if (!incentive) {
        return IncentiveValidationResult.failed(['Incentive not found']);
      }

      // Execute validation
      const validationResult = incentive.validateEligibility();

      // Save validation result
      await this.repository.save(incentive);

      // Publish domain events
      await this.publishDomainEvents(incentive);

      await this.auditLogger.logBusinessEvent('INCENTIVE_VALIDATED', {
        incentiveId,
        isValid: validationResult.isValid,
        errors: validationResult.errors,
      });

      return IncentiveValidationResult.success({
        incentiveId,
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        status: incentive.getStatus(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('VALIDATE_INCENTIVE_ERROR', {
        incentiveId,
        error: errorMessage,
      });
      console.error('Error validating incentive:', error);
      return IncentiveValidationResult.failed([
        'Internal error occurred while validating incentive',
      ]);
    }
  }

  /**
   * Approves an incentive for processing.
   * @param incentiveId - The ID of the incentive to approve.
   * @param reason - The approval reason.
   * @returns Result of the approval.
   */
  public async approveIncentive(
    incentiveId: string,
    reason: string,
  ): Promise<IncentiveApprovalResult> {
    try {
      const incentive = await this.repository.findById(incentiveId);
      if (!incentive) {
        return IncentiveApprovalResult.failed(['Incentive not found']);
      }

      // Execute approval
      incentive.approveForProcessing(reason);
      await this.repository.save(incentive);

      // Publish domain events
      await this.publishDomainEvents(incentive);

      await this.auditLogger.logBusinessEvent('INCENTIVE_APPROVED', {
        incentiveId,
        reason,
        rewardAmount: incentive.getRewardAmount(),
      });

      return IncentiveApprovalResult.success({
        incentiveId,
        status: incentive.getStatus(),
        rewardAmount: incentive.getRewardAmount(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('APPROVE_INCENTIVE_ERROR', {
        incentiveId,
        reason,
        error: errorMessage,
      });
      console.error('Error approving incentive:', error);
      return IncentiveApprovalResult.failed([
        'Internal error occurred while approving incentive',
      ]);
    }
  }

  /**
   * Rejects an incentive.
   * @param incentiveId - The ID of the incentive to reject.
   * @param reason - The rejection reason.
   * @returns Result of the rejection.
   */
  public async rejectIncentive(
    incentiveId: string,
    reason: string,
  ): Promise<IncentiveRejectionResult> {
    try {
      const incentive = await this.repository.findById(incentiveId);
      if (!incentive) {
        return IncentiveRejectionResult.failed(['Incentive not found']);
      }

      // Execute rejection
      incentive.reject(reason);
      await this.repository.save(incentive);

      // Publish domain events
      await this.publishDomainEvents(incentive);

      await this.auditLogger.logBusinessEvent('INCENTIVE_REJECTED', {
        incentiveId,
        reason,
      });

      return IncentiveRejectionResult.success({
        incentiveId,
        status: incentive.getStatus(),
        rejectionReason: reason,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('REJECT_INCENTIVE_ERROR', {
        incentiveId,
        reason,
        error: errorMessage,
      });
      console.error('Error rejecting incentive:', error);
      return IncentiveRejectionResult.failed([
        'Internal error occurred while rejecting incentive',
      ]);
    }
  }

  /**
   * Processes a single incentive payment.
   * Delegates to IncentivePaymentService.
   * @param incentiveId - The ID of the incentive to pay.
   * @param paymentMethod - The payment method.
   * @param contactInfo - Optional contact information.
   * @returns Result of the payment processing.
   */
  public async processPayment(
    incentiveId: string,
    paymentMethod: PaymentMethod,
    contactInfo?: ContactInfo,
  ): Promise<typeof import('./incentive-payment.service').PaymentProcessingResult> {
    return this.paymentService.processPayment(
      incentiveId,
      paymentMethod,
      contactInfo,
    );
  }

  /**
   * Processes batch payments for multiple incentives.
   * Delegates to IncentivePaymentService.
   * @param incentiveIds - Array of incentive IDs to pay.
   * @param paymentMethod - The payment method to use.
   * @returns Result of the batch payment.
   */
  public async processBatchPayment(
    incentiveIds: string[],
    paymentMethod: PaymentMethod,
  ): Promise<typeof import('./incentive-payment.service').BatchPaymentResult> {
    return this.paymentService.processBatchPayment(
      incentiveIds,
      paymentMethod,
    );
  }

  /**
   * Gets incentive statistics.
   * @param ip - Optional IP address for individual stats.
   * @param timeRange - Optional time range for filtering.
   * @returns Statistics result.
   */
  public async getIncentiveStatistics(
    ip?: string,
    timeRange?: { startDate: Date; endDate: Date },
  ): Promise<IncentiveStatsResult> {
    try {
      if (ip) {
        // Get specific IP statistics
        if (!this.validationService.isValidIPAddress(ip)) {
          return IncentiveStatsResult.failed(['Invalid IP address format']);
        }

        const incentives = await this.repository.findByIP(ip, timeRange);
        const stats = this.calculationsService.calculateIPStatistics(
          ip,
          incentives,
        );

        return IncentiveStatsResult.success({ individual: stats });
      } else {
        // Get system-wide statistics
        const systemStats = await this.getSystemStatistics(timeRange);
        return IncentiveStatsResult.success({ system: systemStats });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('GET_INCENTIVE_STATISTICS_ERROR', {
        ip,
        timeRange,
        error: errorMessage,
      });
      console.error('Error getting incentive statistics:', error);
      return IncentiveStatsResult.failed([
        'Internal error occurred while getting statistics',
      ]);
    }
  }

  /**
   * Gets pending incentives sorted by priority.
   * @param status - Optional status filter.
   * @param limit - Maximum number of results.
   * @returns Pending incentives result.
   */
  public async getPendingIncentives(
    status?: IncentiveStatus,
    limit = 50,
  ): Promise<PendingIncentivesResult> {
    try {
      const incentives = await this.repository.findPendingIncentives(
        status,
        limit,
      );
      const prioritizedIncentives = incentives
        .map((incentive) => ({
          incentive: incentive.getIncentiveSummary(),
          priority: IncentiveRules.calculateProcessingPriority(incentive),
        }))
        .sort((a, b) => b.priority.score - a.priority.score);

      return PendingIncentivesResult.success(prioritizedIncentives);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.auditLogger.logError('GET_PENDING_INCENTIVES_ERROR', {
        status,
        limit,
        error: errorMessage,
      });
      console.error('Error getting pending incentives:', error);
      return PendingIncentivesResult.failed([
        'Internal error occurred while getting pending incentives',
      ]);
    }
  }

  /**
   * Publishes uncommitted domain events for an incentive.
   * @param incentive - The incentive with events to publish.
   */
  private async publishDomainEvents(incentive: Incentive): Promise<void> {
    const events = incentive.getUncommittedEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    incentive.markEventsAsCommitted();
  }

  /**
   * Calculates system-wide statistics.
   * @param timeRange - Optional time range for filtering.
   * @returns System statistics.
   */
  private async getSystemStatistics(timeRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<SystemIncentiveStatistics> {
    const allIncentives = await this.repository.findAll(timeRange);
    return this.calculationsService.calculateSystemStatistics(allIncentives);
  }
}

// Re-export result types for backward compatibility
export type {
  BatchPaymentItem,
  PaymentGatewayRequest,
  PaymentGatewayResponse,
  IPIncentiveStatistics,
  SystemIncentiveStatistics,
  IncentiveStatsResult,
  PendingIncentivesResult,
} from './incentive-results.types';

// Re-export interfaces for backward compatibility
export type {
  IIncentiveRepository,
  IDomainEventBus,
  IAuditLogger,
  IPaymentGateway,
} from './incentive-service.interfaces';
