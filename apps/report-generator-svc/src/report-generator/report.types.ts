/**
 * Allowed sort fields for report queries to prevent property injection.
 * Only these fields can be used in the sortBy parameter.
 */
export const ALLOWED_SORT_FIELDS: readonly string[] = [
  'createdAt',
  'updatedAt',
  'generatedAt',
  'jobId',
  'resumeId',
  'status',
  'overallFit',
  'skillsMatch',
  'experienceMatch',
  'educationMatch',
  'processingTimeMs',
  'analysisConfidence',
  'scoreBreakdown.overallFit',
  'scoreBreakdown.skillsMatch',
  'scoreBreakdown.experienceMatch',
  'scoreBreakdown.educationMatch',
  'recommendation.decision',
] as const;

/** Set of allowed sort fields for O(1) lookup */
export const ALLOWED_SORT_FIELDS_SET = new Set(ALLOWED_SORT_FIELDS);

/**
 * Defines the shape of the date grouping.
 */
export interface DateGrouping {
  year: number;
  month?: number;
  day?: number;
  week?: number;
}

/**
 * Defines the shape of the performance metrics.
 */
export interface PerformanceMetrics {
  averageResponseTime: number;
  totalOperations: number;
  successRate: number;
  errorRate: number;
  lastOperationTime: Date;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * Defines the shape of the report create data.
 * Uses the actual schema types from report.schema.ts
 */
export interface ReportCreateData {
  jobId: string;
  resumeId: string;
  scoreBreakdown: {
    overallFit: number;
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
  };
  skillsAnalysis: Array<{
    skill: string;
    matchScore: number;
    matchType: 'exact' | 'partial' | 'related' | 'missing';
    explanation?: string;
  }>;
  recommendation: {
    decision: 'hire' | 'consider' | 'interview' | 'reject';
    reasoning: string;
    strengths: string[];
    concerns: string[];
    suggestions: string[];
  };
  summary: string;
  analysisConfidence: number;
  processingTimeMs: number;
  generatedBy: string;
  llmModel: string;
  requestedBy?: string;
  detailedReportUrl?: string;
}

/**
 * Defines the shape of the report update data.
 */
export interface ReportUpdateData {
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  reportGridFsId?: string;
  detailedReportUrl?: string;
  errorMessage?: string;
  processingTimeMs?: number;
}

/**
 * Defines the shape of the report query.
 */
export interface ReportQuery {
  jobId?: string;
  resumeId?: string;
  status?: string;
  generatedBy?: string;
  requestedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minScore?: number;
  maxScore?: number;
  recommendation?: 'hire' | 'consider' | 'interview' | 'reject';
}

/**
 * Defines the shape of the report list options.
 */
export interface ReportListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeFailedReports?: boolean;
}

/**
 * Defines the shape of the paginated reports.
 */
export interface PaginatedReports {
  reports: unknown[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Defines the shape of the report analytics.
 */
export interface ReportAnalytics {
  totalReports: number;
  reportsByStatus: Record<string, number>;
  reportsByRecommendation: Record<string, number>;
  averageProcessingTime: number;
  averageConfidenceScore: number;
  reportsGeneratedToday: number;
  topPerformingCandidates: {
    resumeId: string;
    overallScore: number;
    recommendation: string;
  }[];
}

/**
 * Defines the shape of job analytics.
 */
export interface JobAnalytics {
  totalApplications: number;
  statusDistribution: Record<string, number>;
  averageScore: number;
  topCandidates: Array<{ resumeId: string; score: number; decision: string }>;
  processingStats: { avgTime: number; successRate: number };
}

/**
 * Defines the shape of time-series analytics.
 */
export interface TimeSeriesAnalytics {
  date: string;
  totalReports: number;
  averageScore: number;
  completedReports: number;
}

/**
 * Defines the shape of health check result.
 */
export interface HealthCheckResult {
  status: string;
  count: number;
  performance: PerformanceMetrics | null;
}

/**
 * Defines the shape of performance metrics report.
 */
export interface PerformanceMetricsReport {
  totalQueries: number;
  averageResponseTime: number;
  slowQueries: number;
  errorRate: number;
  peakQueryTime: number;
  uptime: string;
}
