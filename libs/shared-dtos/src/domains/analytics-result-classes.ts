import type { AnalyticsEventSummary } from './analytics.dto';
import type {
  PrivacyComplianceRiskAssessment,
  AnonymizationRequirementResult,
  AnalyticsDataRetentionPolicy,
  SessionAnalytics,
  EventProcessingMetrics,
  DataPrivacyMetrics,
  ReportingPermissionsResult,
} from './analytics.rules';

/**
 * Represents event creation result.
 */
export class EventCreationResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: AnalyticsEventSummary,
    public readonly errors?: string[],
  ) {}

  /**
   * Performs success operation.
   * @param data - The data.
   * @returns The EventCreationResult.
   */
  public static success(data: AnalyticsEventSummary): EventCreationResult {
    return new EventCreationResult(true, data);
  }

  /**
   * Performs failed operation.
   * @param errors - The errors.
   * @returns The EventCreationResult.
   */
  public static failed(errors: string[]): EventCreationResult {
    return new EventCreationResult(false, undefined, errors);
  }
}

/**
 * Represents batch processing result.
 */
export class BatchProcessingResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      totalEvents: number;
      successCount: number;
      failureCount: number;
      results: BatchProcessingItem[];
    },
    public readonly errors?: string[],
  ) {}

  /**
   * Performs success operation.
   * @param data - The data.
   * @returns The BatchProcessingResult.
   */
  public static success(data: {
    totalEvents: number;
    successCount: number;
    failureCount: number;
    results: BatchProcessingItem[];
  }): BatchProcessingResult {
    return new BatchProcessingResult(true, data);
  }

  /**
   * Performs failed operation.
   * @param errors - The errors.
   * @returns The BatchProcessingResult.
   */
  public static failed(errors: string[]): BatchProcessingResult {
    return new BatchProcessingResult(false, undefined, errors);
  }
}

/**
 * Represents privacy compliance result.
 */
export class PrivacyComplianceResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      eventId: string;
      riskAssessment: PrivacyComplianceRiskAssessment;
      anonymizationRequirement: AnonymizationRequirementResult;
      complianceStatus: 'COMPLIANT' | 'REQUIRES_ACTION';
    },
    public readonly errors?: string[],
  ) {}

  /**
   * Performs success operation.
   * @param data - The data.
   * @returns The PrivacyComplianceResult.
   */
  public static success(data: {
    eventId: string;
    riskAssessment: PrivacyComplianceRiskAssessment;
    anonymizationRequirement: AnonymizationRequirementResult;
    complianceStatus: 'COMPLIANT' | 'REQUIRES_ACTION';
  }): PrivacyComplianceResult {
    return new PrivacyComplianceResult(true, data);
  }

  /**
   * Performs failed operation.
   * @param errors - The errors.
   * @returns The PrivacyComplianceResult.
   */
  public static failed(errors: string[]): PrivacyComplianceResult {
    return new PrivacyComplianceResult(false, undefined, errors);
  }
}

/**
 * Represents data retention report result.
 */
export class DataRetentionReportResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: {
      reportPeriod: { startDate: Date; endDate: Date };
      totalEvents: number;
      eventsToDelete: number;
      eventsToAnonymize: number;
      eventTypeStatistics: Record<string, {
        total: number;
        toDelete: number;
        toAnonymize: number;
      }>;
      retentionPolicies: AnalyticsDataRetentionPolicy[];
    },
    public readonly errors?: string[],
  ) {}

  /**
   * Performs success operation.
   * @param data - The data.
   * @returns The DataRetentionReportResult.
   */
  public static success(data: {
    reportPeriod: { startDate: Date; endDate: Date };
    totalEvents: number;
    eventsToDelete: number;
    eventsToAnonymize: number;
    eventTypeStatistics: Record<string, {
      total: number;
      toDelete: number;
      toAnonymize: number;
    }>;
    retentionPolicies: AnalyticsDataRetentionPolicy[];
  }): DataRetentionReportResult {
    return new DataRetentionReportResult(true, data);
  }

  /**
   * Performs failed operation.
   * @param errors - The errors.
   * @returns The DataRetentionReportResult.
   */
  public static failed(errors: string[]): DataRetentionReportResult {
    return new DataRetentionReportResult(false, undefined, errors);
  }
}

/**
 * Represents session analytics result.
 */
export class SessionAnalyticsResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: SessionAnalytics,
    public readonly errors?: string[],
  ) {}

  /**
   * Performs success operation.
   * @param data - The data.
   * @returns The SessionAnalyticsResult.
   */
  public static success(data: SessionAnalytics): SessionAnalyticsResult {
    return new SessionAnalyticsResult(true, data);
  }

  /**
   * Performs failed operation.
   * @param errors - The errors.
   * @returns The SessionAnalyticsResult.
   */
  public static failed(errors: string[]): SessionAnalyticsResult {
    return new SessionAnalyticsResult(false, undefined, errors);
  }
}

/**
 * Represents event processing metrics result.
 */
export class EventProcessingMetricsResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: EventProcessingMetrics,
    public readonly errors?: string[],
  ) {}

  /**
   * Performs success operation.
   * @param data - The data.
   * @returns The EventProcessingMetricsResult.
   */
  public static success(data: EventProcessingMetrics): EventProcessingMetricsResult {
    return new EventProcessingMetricsResult(true, data);
  }

  /**
   * Performs failed operation.
   * @param errors - The errors.
   * @returns The EventProcessingMetricsResult.
   */
  public static failed(errors: string[]): EventProcessingMetricsResult {
    return new EventProcessingMetricsResult(false, undefined, errors);
  }
}

/**
 * Represents data privacy metrics result.
 */
export class DataPrivacyMetricsResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: DataPrivacyMetrics,
    public readonly errors?: string[],
  ) {}

  /**
   * Performs success operation.
   * @param data - The data.
   * @returns The DataPrivacyMetricsResult.
   */
  public static success(data: DataPrivacyMetrics): DataPrivacyMetricsResult {
    return new DataPrivacyMetricsResult(true, data);
  }

  /**
   * Performs failed operation.
   * @param errors - The errors.
   * @returns The DataPrivacyMetricsResult.
   */
  public static failed(errors: string[]): DataPrivacyMetricsResult {
    return new DataPrivacyMetricsResult(false, undefined, errors);
  }
}

/**
 * Represents reporting access result.
 */
export class ReportingAccessResult {
  private constructor(
    public readonly success: boolean,
    public readonly data?: ReportingPermissionsResult,
    public readonly errors?: string[],
  ) {}

  /**
   * Performs success operation.
   * @param data - The data.
   * @returns The ReportingAccessResult.
   */
  public static success(data: ReportingPermissionsResult): ReportingAccessResult {
    return new ReportingAccessResult(true, data);
  }

  /**
   * Performs failed operation.
   * @param errors - The errors.
   * @returns The ReportingAccessResult.
   */
  public static failed(errors: string[]): ReportingAccessResult {
    return new ReportingAccessResult(false, undefined, errors);
  }
}

/**
 * Defines shape of batch processing item.
 */
export interface BatchProcessingItem {
  eventId: string;
  success: boolean;
  processedAt?: Date;
  error?: string;
}
