import type {
  Incentive,
  ContactInfo,
  PaymentMethod} from './incentive.dto';
import {
  TriggerType
} from './incentive.dto';
import { IncentiveRules } from './incentive.rules';
import type { IIncentiveRepository } from './incentive-service.interfaces';
import type { IAuditLogger } from './incentive-service.interfaces';
import type {
  IncentiveEligibilityResult,
  PaymentEligibilityResult,
  PaymentMethodValidationResult,
} from './incentive.rules';

/**
 * Handles incentive validation logic including eligibility checks,
 * creation validation, and payment method validation.
 */
export class IncentiveValidationService {
  constructor(
    private readonly repository: IIncentiveRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  /**
   * Validates if a questionnaire incentive can be created.
   * @param ip - The IP address of the requester.
   * @param questionnaireId - The questionnaire ID.
   * @param qualityScore - The quality score achieved.
   * @returns Validation result with eligibility status and any errors.
   */
  public async validateQuestionnaireIncentiveCreation(
    ip: string,
    questionnaireId: string,
    qualityScore: number,
  ): Promise<IncentiveEligibilityResult> {
    const todayIncentives = await this.repository.countTodayIncentives(ip);

    const eligibility = IncentiveRules.canCreateIncentive(
      ip,
      TriggerType.QUESTIONNAIRE_COMPLETION,
      { questionnaireId, qualityScore },
      todayIncentives,
    );

    if (!eligibility.isEligible) {
      await this.auditLogger.logBusinessEvent('INCENTIVE_CREATION_DENIED', {
        ip,
        questionnaireId,
        qualityScore,
        errors: eligibility.errors,
      });
    }

    return eligibility;
  }

  /**
   * Validates if a referral incentive can be created.
   * @param referrerIP - The referrer's IP address.
   * @param referredIP - The referred person's IP address.
   * @returns Validation result with eligibility status and any errors.
   */
  public async validateReferralIncentiveCreation(
    referrerIP: string,
    referredIP: string,
  ): Promise<ReferralEligibilityResult> {
    const todayIncentives = await this.repository.countTodayIncentives(referrerIP);

    const eligibility = IncentiveRules.canCreateIncentive(
      referrerIP,
      TriggerType.REFERRAL,
      { referredIP },
      todayIncentives,
    );

    if (!eligibility.isEligible) {
      await this.auditLogger.logBusinessEvent('REFERRAL_INCENTIVE_DENIED', {
        referrerIP,
        referredIP,
        errors: eligibility.errors,
      });
    }

    // Check if referral already exists
    const existingReferral = await this.repository.findReferralIncentive(
      referrerIP,
      referredIP,
    );

    if (existingReferral) {
      return ReferralEligibilityResult.notEligible([
        'Referral incentive already exists for this IP pair',
      ]);
    }

    return ReferralEligibilityResult.eligible();
  }

  /**
   * Validates incentive eligibility for payment.
   * @param incentive - The incentive to validate.
   * @returns Validation result with payment eligibility.
   */
  public validatePaymentEligibility(
    incentive: Incentive,
  ): PaymentEligibilityResult {
    return IncentiveRules.canPayIncentive(incentive);
  }

  /**
   * Validates payment method compatibility with contact information.
   * @param paymentMethod - The payment method to validate.
   * @param contactInfo - The contact information to validate against.
   * @returns Validation result with compatibility status.
   */
  public validatePaymentMethodCompatibility(
    paymentMethod: PaymentMethod,
    contactInfo: ContactInfo,
  ): PaymentMethodValidationResult {
    return IncentiveRules.validatePaymentMethodCompatibility(
      paymentMethod,
      contactInfo,
    );
  }

  /**
   * Validates batch payment eligibility for multiple incentives.
   * @param incentives - Array of incentives to validate for batch payment.
   * @returns Validation result with batch payment eligibility.
   */
  public validateBatchPayment(
    incentives: Incentive[],
  ): BatchPaymentValidationResult {
    const batchValidation = IncentiveRules.validateBatchPayment(incentives);
    return batchValidation.isValid
      ? BatchPaymentValidationResult.valid()
      : BatchPaymentValidationResult.invalid(batchValidation.errors);
  }

  /**
   * Validates if an IP address format is correct.
   * @param ip - The IP address to validate.
   * @returns True if the IP address format is valid, false otherwise.
   */
  public isValidIPAddress(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return false;
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }
}

/**
 * Result of referral eligibility validation with existing referral check.
 */
export class ReferralEligibilityResult {
  private constructor(
    public readonly isEligible: boolean,
    public readonly errors?: string[],
    public readonly existingReferral?: boolean,
  ) {}

  static eligible(): ReferralEligibilityResult {
    return new ReferralEligibilityResult(true);
  }

  static notEligible(errors: string[]): ReferralEligibilityResult {
    return new ReferralEligibilityResult(false, errors);
  }
}

/**
 * Result of batch payment validation.
 */
export class BatchPaymentValidationResult {
  private constructor(
    public readonly isValid: boolean,
    public readonly errors?: string[],
  ) {}

  static valid(): BatchPaymentValidationResult {
    return new BatchPaymentValidationResult(true);
  }

  static invalid(errors: string[]): BatchPaymentValidationResult {
    return new BatchPaymentValidationResult(false, errors);
  }
}
