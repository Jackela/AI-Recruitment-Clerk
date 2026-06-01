import type { Incentive } from '../../aggregates/incentive.aggregate.js';
import { IncentiveStatus } from '../../aggregates/incentive.aggregate.js';
import type {
  IAuditLogger,
  IIncentiveRepository,
  SystemIncentiveStatistics,
} from '../../../application/dtos/incentive.dto.js';
import {
  IncentiveStatsResult,
  PendingIncentivesResult,
} from '../../../application/dtos/incentive.dto.js';
import { IncentiveRules } from '../incentive.rules.js';
import { IncentiveDomainHelpers } from './incentive-domain.helpers.js';

export class IncentiveStatisticsService {
  constructor(
    private readonly repository: IIncentiveRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  public async getIncentiveStatistics(
    ip?: string,
    timeRange?: { startDate: Date; endDate: Date },
  ): Promise<IncentiveStatsResult> {
    try {
      if (ip) {
        if (!IncentiveDomainHelpers.isValidIPAddress(ip)) {
          return IncentiveStatsResult.failed(['Invalid IP address format']);
        }

        const incentives = await this.repository.findByIP(ip, timeRange);
        return IncentiveStatsResult.success({
          individual: IncentiveDomainHelpers.calculateIPStatistics(
            ip,
            incentives,
          ),
        });
      }

      const systemStats = await this.calculateSystemStatistics(timeRange);
      return IncentiveStatsResult.success({ system: systemStats });
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

  private async calculateSystemStatistics(timeRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<SystemIncentiveStatistics> {
    const allIncentives = await this.repository.findAll(timeRange);
    let totalAmount = 0;
    let paidAmount = 0;
    const uniqueIPs = new Set<string>();
    const statusCount = {
      pending_validation: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
    };

    for (const incentive of allIncentives as Incentive[]) {
      totalAmount += incentive.getRewardAmount();
      uniqueIPs.add(incentive.getRecipientIP());

      switch (incentive.getStatus()) {
        case IncentiveStatus.PENDING_VALIDATION:
          statusCount.pending_validation++;
          break;
        case IncentiveStatus.APPROVED:
          statusCount.approved++;
          break;
        case IncentiveStatus.PAID:
          statusCount.paid++;
          paidAmount += incentive.getRewardAmount();
          break;
        case IncentiveStatus.REJECTED:
          statusCount.rejected++;
          break;
      }
    }

    return {
      totalIncentives: allIncentives.length,
      uniqueRecipients: uniqueIPs.size,
      totalAmount,
      paidAmount,
      pendingAmount: totalAmount - paidAmount,
      statusBreakdown: statusCount,
      averageRewardPerIncentive:
        allIncentives.length > 0 ? totalAmount / allIncentives.length : 0,
      averageRewardPerIP: uniqueIPs.size > 0 ? totalAmount / uniqueIPs.size : 0,
      conversionRate:
        allIncentives.length > 0
          ? (statusCount.paid / allIncentives.length) * 100
          : 0,
    };
  }
}
