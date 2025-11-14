import { PerformanceMonitorService } from './performance-monitor.service';

describe('PerformanceMonitorService', () => {
  let service: PerformanceMonitorService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new PerformanceMonitorService();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('tracks operations, quality metrics, and produces summaries', async () => {
    const opSuccess = service.startOperation('generate-report', {
      reportType: 'individual',
      outputFormat: 'pdf',
      jobId: 'job-123',
    });
    jest.advanceTimersByTime(250);
    service.endOperation(opSuccess, true, undefined, {
      llmModel: 'gpt-4',
    });

    const opFailure = service.startOperation('generate-report', {
      reportType: 'batch',
      outputFormat: 'html',
      jobId: 'job-456',
    });
    jest.advanceTimersByTime(800);
    service.endOperation(opFailure, false, 'Timeout connecting to LLM');

    const now = new Date();
    service.recordQualityMetrics({
      reportId: 'report-1',
      qualityScore: 4.8,
      criteriaScores: {
        completeness: 5,
        accuracy: 5,
        relevance: 4.5,
        clarity: 4.5,
        actionability: 4.0,
      },
      timestamp: now,
    });

    service.recordQualityMetrics({
      reportId: 'report-2',
      qualityScore: 3.0,
      criteriaScores: {
        completeness: 3,
        accuracy: 3,
        relevance: 3,
        clarity: 3,
        actionability: 3,
      },
      reviewerFeedback: 'Needs improvement',
      improvementSuggestions: ['Tighten summary'],
      timestamp: new Date(now.getTime() - 5 * 60 * 1000),
    });

    const summary = await service.getPerformanceSummary({
      startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 1000),
    });

    expect(summary.totalReports).toBe(2);
    expect(summary.successRate).toBe(0.5);
    expect(summary.reportsByType.individual).toBe(1);
    expect(summary.reportsByType.batch).toBe(1);
    expect(summary.errorBreakdown.timeout).toBe(1);
    expect(summary.qualityTrends.length).toBeGreaterThan(0);
    expect(summary.performanceTrends.length).toBeGreaterThan(0);

    const health = await service.getSystemHealth();
    expect(health.status).toBe('unhealthy');
    expect(health.metrics.activeOperations).toBe(0);
    expect(health.alerts.some((alert) => alert.includes('Success rate'))).toBe(
      true,
    );
  });
});
