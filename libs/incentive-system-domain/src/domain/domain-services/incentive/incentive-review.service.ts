import type {
  IAuditLogger,
  IDomainEventBus,
  IIncentiveRepository,
} from '../../../application/dtos/incentive.dto.js';
import {
  IncentiveApprovalResult,
  IncentiveRejectionResult,
} from '../../../application/dtos/incentive.dto.js';
import { IncentiveDomainHelpers } from './incentive-domain.helpers.js';

export class IncentiveReviewService {
  constructor(
    private readonly repository: IIncentiveRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly auditLogger: IAuditLogger,
  ) {}

  public async approveIncentive(
    incentiveId: string,
    reason: string,
  ): Promise<IncentiveApprovalResult> {
    try {
      const incentive = await this.repository.findById(incentiveId);
      if (!incentive) {
        return IncentiveApprovalResult.failed(['Incentive not found']);
      }

      incentive.approveForProcessing(reason);
      await this.repository.save(incentive);
      await IncentiveDomainHelpers.publishEvents(incentive, this.eventBus);
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

  public async rejectIncentive(
    incentiveId: string,
    reason: string,
  ): Promise<IncentiveRejectionResult> {
    try {
      const incentive = await this.repository.findById(incentiveId);
      if (!incentive) {
        return IncentiveRejectionResult.failed(['Incentive not found']);
      }

      incentive.reject(reason);
      await this.repository.save(incentive);
      await IncentiveDomainHelpers.publishEvents(incentive, this.eventBus);
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
}
