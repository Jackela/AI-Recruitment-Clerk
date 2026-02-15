import type {
  Incentive} from './incentive.dto';
import {
  IncentiveStatus,
} from './incentive.dto';
import type {
  IPIncentiveStatistics,
  SystemIncentiveStatistics,
} from './incentive-results.types';

/**
 * Handles incentive statistics calculations and reporting.
 * Provides methods for calculating IP-based and system-wide statistics.
 */
export class IncentiveCalculationsService {
  /**
   * Calculates statistics for a specific IP address.
   * @param ip - The IP address to calculate statistics for.
   * @param incentives - Array of incentives for the IP.
   * @returns IP incentive statistics.
   */
  public calculateIPStatistics(
    ip: string,
    incentives: Incentive[],
  ): IPIncentiveStatistics {
    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;

    const statusCount = {
      pending: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
    };

    for (const incentive of incentives) {
      const amount = incentive.getRewardAmount();
      totalAmount += amount;

      switch (incentive.getStatus()) {
        case IncentiveStatus.PENDING_VALIDATION:
          statusCount.pending++;
          pendingAmount += amount;
          break;
        case IncentiveStatus.APPROVED:
          statusCount.approved++;
          pendingAmount += amount;
          break;
        case IncentiveStatus.PAID:
          statusCount.paid++;
          paidAmount += amount;
          break;
        case IncentiveStatus.REJECTED:
          statusCount.rejected++;
          break;
      }
    }

    return {
      ip,
      totalIncentives: incentives.length,
      totalAmount,
      paidAmount,
      pendingAmount,
      statusBreakdown: statusCount,
      averageReward:
        incentives.length > 0 ? totalAmount / incentives.length : 0,
      lastIncentiveDate:
        incentives.length > 0
          ? Math.max(...incentives.map((i) => i.getCreatedAt().getTime()))
          : undefined,
    };
  }

  /**
   * Calculates system-wide statistics.
   * @param allIncentives - Array of all incentives in the system.
   * @returns System incentive statistics.
   */
  public calculateSystemStatistics(
    allIncentives: Incentive[],
  ): SystemIncentiveStatistics {
    let totalAmount = 0;
    let paidAmount = 0;
    const uniqueIPs = new Set<string>();

    const statusCount = {
      pending: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
    };

    for (const incentive of allIncentives) {
      totalAmount += incentive.getRewardAmount();
      uniqueIPs.add(incentive.getRecipientIP());

      switch (incentive.getStatus()) {
        case IncentiveStatus.PENDING_VALIDATION:
          statusCount.pending++;
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

  /**
   * Calculates the total amount for an array of incentives.
   * @param incentives - Array of incentives.
   * @returns Total reward amount.
   */
  public calculateTotalAmount(incentives: Incentive[]): number {
    return incentives.reduce(
      (sum, incentive) => sum + incentive.getRewardAmount(),
      0,
    );
  }

  /**
   * Filters incentives by status.
   * @param incentives - Array of incentives.
   * @param status - Status to filter by.
   * @returns Filtered incentives.
   */
  public filterByStatus(
    incentives: Incentive[],
    status: IncentiveStatus,
  ): Incentive[] {
    return incentives.filter((i) => i.getStatus() === status);
  }

  /**
   * Gets unique IP addresses from incentives.
   * @param incentives - Array of incentives.
   * @returns Set of unique IP addresses.
   */
  public getUniqueIPs(incentives: Incentive[]): Set<string> {
    return new Set(incentives.map((i) => i.getRecipientIP()));
  }

  /**
   * Calculates average reward per incentive.
   * @param incentives - Array of incentives.
   * @returns Average reward amount, or 0 if no incentives.
   */
  public calculateAverageReward(incentives: Incentive[]): number {
    if (incentives.length === 0) return 0;
    const total = this.calculateTotalAmount(incentives);
    return total / incentives.length;
  }

  /**
   * Calculates conversion rate (percentage of paid incentives).
   * @param incentives - Array of incentives.
   * @returns Conversion rate as a percentage.
   */
  public calculateConversionRate(incentives: Incentive[]): number {
    if (incentives.length === 0) return 0;
    const paidCount = incentives.filter(
      (i) => i.getStatus() === IncentiveStatus.PAID,
    ).length;
    return (paidCount / incentives.length) * 100;
  }
}
