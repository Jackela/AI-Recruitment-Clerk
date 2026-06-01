import {
  Incentive,
  TriggerType,
} from '../../aggregates/incentive.aggregate.js';
import type { ContactInfo } from '../../value-objects/index.js';
import type {
  IAuditLogger,
  IDomainEventBus,
  IIncentiveRepository,
} from '../../../application/dtos/incentive.dto.js';
import { IncentiveCreationResult } from '../../../application/dtos/incentive.dto.js';
import { IncentiveRules } from '../incentive.rules.js';
import { IncentiveDomainHelpers } from './incentive-domain.helpers.js';

export class IncentiveCreationService {
  constructor(
    private readonly repository: IIncentiveRepository,
    private readonly eventBus: IDomainEventBus,
    private readonly auditLogger: IAuditLogger,
  ) {}

  public async createQuestionnaireIncentive(
    ip: string,
    questionnaireId: string,
    qualityScore: number,
    contactInfo: ContactInfo,
  ): Promise<IncentiveCreationResult> {
    try {
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
        return IncentiveCreationResult.failed(eligibility.errors);
      }

      const incentive = Incentive.createQuestionnaireIncentive(
        ip,
        questionnaireId,
        qualityScore,
        contactInfo,
      );

      await this.repository.save(incentive);
      await IncentiveDomainHelpers.publishEvents(incentive, this.eventBus);
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

  public async createReferralIncentive(
    referrerIP: string,
    referredIP: string,
    contactInfo: ContactInfo,
  ): Promise<IncentiveCreationResult> {
    try {
      const todayIncentives =
        await this.repository.countTodayIncentives(referrerIP);
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
        return IncentiveCreationResult.failed(eligibility.errors);
      }

      const existingReferral = await this.repository.findReferralIncentive(
        referrerIP,
        referredIP,
      );
      if (existingReferral) {
        return IncentiveCreationResult.failed([
          'Referral incentive already exists for this IP pair',
        ]);
      }

      const incentive = Incentive.createReferralIncentive(
        referrerIP,
        referredIP,
        contactInfo,
      );

      await this.repository.save(incentive);
      await IncentiveDomainHelpers.publishEvents(incentive, this.eventBus);
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
}
