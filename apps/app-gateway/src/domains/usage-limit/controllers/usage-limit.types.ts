import type { Request } from 'express';
import type { UserDto } from '@ai-recruitment-clerk/user-management-domain';

/**
 * Extended request interface for authenticated requests.
 */
export interface AuthenticatedRequest extends Request {
  user: UserDto & { id: string; organizationId: string };
}

/**
 * Response wrapper for controller responses.
 */
export interface ControllerResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}

/**
 * Usage check result data.
 */
export interface UsageCheckData {
  ip: string;
  currentUsage: number;
  availableQuota: number;
  dailyLimit: number;
  bonusQuota: number;
  canUse: boolean;
  resetAt?: string;
  usagePercentage: number;
  lastActivityAt?: string;
}

/**
 * Usage record result data.
 */
export interface UsageRecordData {
  currentUsage: number;
  remainingQuota: number;
  usagePercentage: number;
  recordedAt: string;
}

/**
 * Bonus quota result data.
 */
export interface BonusQuotaData {
  ip: string;
  bonusType: string;
  bonusAmount: number;
  newTotalQuota: number;
  reason: string;
  grantedBy: string;
  grantedAt: string;
}

/**
 * Usage limits list result data.
 */
export interface UsageLimitsListData {
  usageLimits: unknown[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  summary: {
    totalIPs: number;
    averageUsage: number;
    exceedingLimitCount: number;
    totalBonusQuotaGranted: number;
  };
}

/**
 * Usage limit detail data.
 */
export interface UsageLimitDetailData {
  ip: string;
  currentUsage: number;
  dailyLimit: number;
  bonusQuota: number;
  lastActivity: string;
  usageHistory: unknown[];
}

/**
 * Policy update result data.
 */
export interface PolicyUpdateData {
  configId: string;
  configuration: unknown;
  policy: unknown;
  updatedBy: string;
  updatedAt: string;
  affectedIPs?: number;
  effectiveFrom: string;
}

/**
 * Reset result data.
 */
export interface ResetResultData {
  ip: string;
  previousUsage: number;
  newUsage: number;
  previousQuota: number;
  newQuota: number;
  reason: string;
  resetBy: string;
  resetAt: string;
}

/**
 * Batch operation result data.
 */
export interface BatchOperationData {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: unknown[];
  action: string;
  operatedBy: string;
}

/**
 * Usage statistics overview data.
 */
export interface UsageStatisticsData {
  overview: {
    totalActiveIPs: number;
    totalUsage: number;
    averageUsagePerIP: number;
    quotaUtilizationRate: number;
  };
  quotaDistribution: unknown;
  bonusQuotaStats: unknown;
  usagePatterns: unknown;
  peakUsageTimes: unknown;
  trendsOverTime: unknown;
}

/**
 * Export result data.
 */
export interface ExportResultData {
  exportId: string;
  format: string;
  estimatedTime: string;
  downloadUrl: string;
  expiresAt: string;
}

/**
 * Rate limit config result data.
 */
export interface RateLimitConfigData {
  configId: string;
  configuration: unknown;
  updatedBy: string;
  updatedAt: string;
  effectiveFrom: string;
}

/**
 * Health check result data.
 */
export interface HealthCheckData {
  status: string;
  timestamp: string;
  service: string;
  details?: {
    database: string;
    redis: string;
    rateLimiting: string;
    quotaSystem: string;
    performanceMetrics: {
      averageResponseTime: number;
      requestsPerSecond: number;
      errorRate: number;
    };
  };
  error?: string;
}

/**
 * Utility class for common controller operations.
 */
export class UsageLimitControllerUtils {
  /**
   * Safely gets a header value, handling string | string[] | undefined.
   * @param headers - The headers object.
   * @param name - The header name.
   * @returns The header value as a string or undefined.
   */
  static getHeaderValue(
    headers: Record<string, string | string[] | undefined> | Headers,
    name: string,
  ): string | undefined {
    if (headers instanceof Headers) {
      const value = headers.get(name);
      return value ?? undefined;
    }
    const value = headers[name];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  /**
   * Gets the target IP for an operation.
   * @param req - The authenticated request.
   * @param providedIp - The optionally provided IP (for admin override).
   * @returns The target IP address.
   */
  static getTargetIP(
    req: AuthenticatedRequest,
    providedIp?: string,
  ): string {
    // Check admin permissions for IP override
    const hasAdminPermission = (req.user as UserDto & { permissions?: string[] }).permissions?.includes('admin');

    if (providedIp && hasAdminPermission) {
      return providedIp;
    }

    return (
      (req as Request & { socket?: { remoteAddress?: string } }).socket?.remoteAddress ||
      this.getHeaderValue(req.headers, 'x-forwarded-for') ||
      'unknown'
    );
  }

  /**
   * Creates an error response.
   * @param error - The error that occurred.
   * @param defaultMessage - The default error message.
   * @returns A standardized error response.
   */
  static createErrorResponse(
    error: unknown,
    defaultMessage: string,
  ): { success: false; error: string; message: string } {
    return {
      success: false,
      error: defaultMessage,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
