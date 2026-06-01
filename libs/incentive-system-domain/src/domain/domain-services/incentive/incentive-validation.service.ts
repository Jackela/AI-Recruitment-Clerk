import type {
  IAuditLogger,
  IDomainEventBus,
  IIncentiveRepository,
} from '../../../application/dtos/incentive.dto.js';
import { IncentiveValidationResult } from '../../../application/dtos/incentive.dto.js';
import { IncentiveDomainHelpers } from './incentive-domain.helpers.js';

export class IncentiveValidationService {
  constructor(
    private readonly repository: IIncentiveRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly auditLogger: IAuditLogger,
  ) {}

  public async validateIncentive(
    incentiveId: string,
  ): Promise<IncentiveValidationResult> {
    try {
      const incentive = await this.repository.findById(incentiveId);
      if (!incentive) {
        return IncentiveValidationResult.failed(['Incentive not found']);
      }

      const validationResult = incentive.validateEligibility();
      await this.repository.save(incentive);
      await IncentiveDomainHelpers.publishEvents(incentive, this.eventBus);
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
}
