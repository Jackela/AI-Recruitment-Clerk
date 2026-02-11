import type {
  UsageLimit,
  UsageLimitPolicy,
  UsageStatistics,
} from './usage-limit.dto';

/**
 * Defines the shape of the time range.
 */
export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Defines the shape of the system usage statistics.
 */
export interface SystemUsageStatistics {
  totalIPs: number;
  activeIPs: number;
  totalUsage: number;
  totalQuota: number;
  totalBonusQuota: number;
  systemUtilization: number;
  averageUsagePerIP: number;
}

/**
 * Defines the shape of the usage pattern analysis.
 */
export interface UsagePatternAnalysis {
  timeRange: { startDate: Date; endDate: Date };
  totalAnalyzedIPs: number;
  patterns: Array<{
    type: 'peak' | 'low' | 'consistent' | 'sporadic';
    timeWindow: string;
    frequency: number;
    description: string;
  }>;
  hourlyDistribution: { [hour: string]: number };
  dailyDistribution: { [date: string]: number };
  peakUsageHour: number;
  averageUsagePerIP: number;
}

/**
 * Defines the shape of the usage pattern.
 */
export interface UsagePattern {
  type: 'peak' | 'low' | 'consistent' | 'sporadic';
  timeWindow: string;
  frequency: number;
  description: string;
}

/**
 * Helper class for quota calculation operations.
 * Extracted from UsageLimitDomainService for better maintainability.
 */
export class QuotaCalculatorHelper {
  /**
   * The time window in milliseconds to consider an IP as active (24 hours).
   */
  private static readonly ACTIVE_IP_WINDOW_MS = 24 * 60 * 60 * 1000;

  /**
   * Calculates system-wide usage statistics from all usage limits.
   * @param usageLimits - Array of all usage limits to analyze.
   * @returns System usage statistics.
   */
  public static calculateSystemStatistics(
    usageLimits: UsageLimit[],
  ): SystemUsageStatistics {
    let totalUsage = 0;
    let totalQuota = 0;
    let totalBonusQuota = 0;
    let activeIPs = 0;
    const now = Date.now();

    for (const usageLimit of usageLimits) {
      const stats = usageLimit.getUsageStatistics();
      totalUsage += stats.currentUsage;
      totalQuota += stats.availableQuota;
      totalBonusQuota += stats.bonusQuota;

      if (
        stats.lastActivityAt &&
        now - stats.lastActivityAt.getTime() < this.ACTIVE_IP_WINDOW_MS
      ) {
        activeIPs++;
      }
    }

    return {
      totalIPs: usageLimits.length,
      activeIPs,
      totalUsage,
      totalQuota,
      totalBonusQuota,
      systemUtilization: totalQuota > 0 ? (totalUsage / totalQuota) * 100 : 0,
      averageUsagePerIP:
        usageLimits.length > 0 ? totalUsage / usageLimits.length : 0,
    };
  }

  /**
   * Performs usage pattern analysis over a time range.
   * @param usageLimits - Array of usage limits to analyze.
   * @param timeRange - The time range for analysis.
   * @returns Usage pattern analysis results.
   */
  public static performUsageAnalysis(
    usageLimits: UsageLimit[],
    timeRange: TimeRange,
  ): UsagePatternAnalysis {
    const hourlyUsage = new Map<number, number>();
    const dailyUsage = new Map<string, number>();

    for (const usageLimit of usageLimits) {
      const stats = usageLimit.getUsageStatistics();

      // Track usage by hour
      if (stats.lastActivityAt) {
        const hour = stats.lastActivityAt.getHours();
        hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + stats.currentUsage);
      }

      // Track usage by date
      if (stats.lastActivityAt) {
        const dateStr = stats.lastActivityAt.toISOString().split('T')[0];
        dailyUsage.set(
          dateStr,
          (dailyUsage.get(dateStr) || 0) + stats.currentUsage,
        );
      }
    }

    return {
      timeRange,
      totalAnalyzedIPs: usageLimits.length,
      patterns: [], // Patterns can be expanded in future iterations
      hourlyDistribution: Object.fromEntries(hourlyUsage),
      dailyDistribution: Object.fromEntries(dailyUsage),
      peakUsageHour: this.findPeakHour(hourlyUsage),
      averageUsagePerIP:
        usageLimits.length > 0
          ? usageLimits.reduce((sum, ul) => sum + ul.getCurrentUsage(), 0) /
            usageLimits.length
          : 0,
    };
  }

  /**
   * Finds the hour with peak usage.
   * @param hourlyUsage - Map of hour to usage count.
   * @returns The hour with highest usage (0-23).
   */
  private static findPeakHour(hourlyUsage: Map<number, number>): number {
    let maxUsage = 0;
    let peakHour = 0;

    for (const [hour, usage] of hourlyUsage) {
      if (usage > maxUsage) {
        maxUsage = usage;
        peakHour = hour;
      }
    }

    return peakHour;
  }

  /**
   * Calculates remaining quota for a usage limit.
   * @param statistics - Usage statistics.
   * @returns Remaining quota.
   */
  public static calculateRemainingQuota(statistics: UsageStatistics): number {
    return Math.max(0, statistics.availableQuota - statistics.currentUsage);
  }

  /**
   * Calculates the next reset time based on current time.
   * @param currentTime - Current time.
   * @param resetHourUTC - Hour of day to reset (0-23).
   * @returns Next reset time.
   */
  public static calculateNextResetTime(
    currentTime: Date,
    resetHourUTC = 0,
  ): Date {
    const nextReset = new Date(currentTime);
    nextReset.setDate(nextReset.getDate() + 1);
    nextReset.setHours(resetHourUTC, 0, 0, 0);
    return nextReset;
  }

  /**
   * Checks if a usage limit should be reset based on time.
   * @param lastResetAt - Last reset time.
   * @param currentTime - Current time.
   * @returns True if reset is needed.
   */
  public static shouldResetUsage(
    lastResetAt: Date,
    currentTime: Date = new Date(),
  ): boolean {
    const lastResetDate = new Date(
      lastResetAt.getFullYear(),
      lastResetAt.getMonth(),
      lastResetAt.getDate(),
    );
    const currentDate = new Date(
      currentTime.getFullYear(),
      currentTime.getMonth(),
      currentTime.getDate(),
    );

    return currentDate > lastResetDate;
  }

  /**
   * Validates a usage limit policy.
   * @param policy - The policy to validate.
   * @returns True if policy is valid.
   */
  public static isValidPolicy(policy: UsageLimitPolicy): boolean {
    return (
      policy.dailyLimit > 0 &&
      policy.dailyLimit <= 50 &&
      policy.maxBonusQuota >= 0 &&
      policy.maxBonusQuota <= 100 &&
      policy.resetTimeUTC >= 0 &&
      policy.resetTimeUTC <= 23
    );
  }
}
