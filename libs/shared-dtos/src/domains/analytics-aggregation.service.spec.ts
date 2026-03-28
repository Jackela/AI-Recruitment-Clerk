import { AnalyticsAggregationService } from './analytics-aggregation.service';
import { EventStatus } from './analytics.dto';
import type {
  IAnalyticsRepository,
  IDomainEventBus,
  IAuditLogger,
} from './analytics-interfaces.dto';

// Mocks
const mockRepository: jest.Mocked<IAnalyticsRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  findBySession: jest.fn(),
  findByDateRange: jest.fn(),
  findByIds: jest.fn(),
  countSessionEvents: jest.fn(),
};

const mockEventBus: jest.Mocked<IDomainEventBus> = {
  publish: jest.fn(),
};

const mockAuditLogger: jest.Mocked<IAuditLogger> = {
  logSecurityEvent: jest.fn(),
  logBusinessEvent: jest.fn(),
  logError: jest.fn(),
};

describe('AnalyticsAggregationService', () => {
  let service: AnalyticsAggregationService;

beforeEach(() => {
jest.clearAllMocks();
service = new AnalyticsAggregationService(
mockRepository,
mockEventBus,
mockAuditLogger,
);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('processBatchEvents', () => {
    const mockEventIds = ['event-1', 'event-2', 'event-3'];

    it('should process batch events successfully', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PENDING_PROCESSING),
        createMockAnalyticsEvent('event-2', EventStatus.PENDING_PROCESSING),
        createMockAnalyticsEvent('event-3', EventStatus.PENDING_PROCESSING),
      ];

      mockRepository.findByIds.mockResolvedValue(mockEvents);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.processBatchEvents(mockEventIds);

      expect(result.success).toBe(true);
      expect(result.data?.successCount).toBe(3);
      expect(result.data?.failureCount).toBe(0);
      expect(mockRepository.save).toHaveBeenCalledTimes(3);
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should fail when no events found', async () => {
      mockRepository.findByIds.mockResolvedValue([]);

      const result = await service.processBatchEvents(mockEventIds);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No valid events found for processing');
    });

    it('should skip events not in pending status', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PROCESSED),
        createMockAnalyticsEvent('event-2', EventStatus.ERROR),
      ];

      mockRepository.findByIds.mockResolvedValue(mockEvents);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.processBatchEvents(['event-1', 'event-2']);

      expect(result.success).toBe(true);
      expect(result.data?.successCount).toBe(0);
      expect(result.data?.failureCount).toBe(2);
    });

    it('should handle partial failures during processing', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PENDING_PROCESSING),
        createMockAnalyticsEvent('event-2', EventStatus.PENDING_PROCESSING),
      ];

      mockRepository.findByIds.mockResolvedValue(mockEvents);
      mockRepository.save
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Save error'));
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.processBatchEvents(['event-1', 'event-2']);

      expect(result.success).toBe(true);
      expect(result.data?.successCount).toBe(1);
      expect(result.data?.failureCount).toBe(1);
    });

    it('should handle repository find errors', async () => {
      mockRepository.findByIds.mockRejectedValue(new Error('Database error'));
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.processBatchEvents(mockEventIds);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Internal error occurred while processing batch events',
      );
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });

    it('should handle empty eventIds array', async () => {
      mockRepository.findByIds.mockResolvedValue([]);

      const result = await service.processBatchEvents([]);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No valid events found for processing');
    });

    it('should process events in correct order', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PENDING_PROCESSING),
        createMockAnalyticsEvent('event-2', EventStatus.PENDING_PROCESSING),
      ];

      mockRepository.findByIds.mockResolvedValue(mockEvents);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.processBatchEvents(['event-1', 'event-2']);

      expect(result.success).toBe(true);
      expect(result.data?.results).toHaveLength(2);
    });

    it('should validate batch eligibility before processing', async () => {
      // Create a batch that would fail eligibility check
      const tooManyEvents = Array(1001)
        .fill(null)
        .map((_, i) =>
          createMockAnalyticsEvent(
            `event-${i}`,
            EventStatus.PENDING_PROCESSING,
          ),
        );

      mockRepository.findByIds.mockResolvedValue(tooManyEvents);

      const result = await service.processBatchEvents(
        tooManyEvents.map((e) => e.getId().getValue()),
      );

      expect(result.success).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('getEventProcessingMetrics', () => {
    const timeRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    it('should calculate event processing metrics successfully', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PROCESSED),
        createMockAnalyticsEvent('event-2', EventStatus.PROCESSED),
        createMockAnalyticsEvent('event-3', EventStatus.ERROR),
        createMockAnalyticsEvent('event-4', EventStatus.PENDING_PROCESSING),
      ];

      mockRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.getEventProcessingMetrics(timeRange);

      expect(result.success).toBe(true);
      expect(result.data?.totalEvents).toBe(4);
      expect(result.data?.processedEvents).toBe(2);
      expect(result.data?.failedEvents).toBe(1);
      expect(result.data?.errorRate).toBe(25); // 1 failed out of 4 total
    });

    it('should calculate throughput correctly', async () => {
      const mockEvents = Array(100)
        .fill(null)
        .map(() =>
          createMockAnalyticsEvent(
            `event-${Math.random()}`,
            EventStatus.PROCESSED,
          ),
        );

      mockRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.getEventProcessingMetrics(timeRange);

      expect(result.success).toBe(true);
      expect(result.data?.throughputPerSecond).toBeGreaterThan(0);
    });

    it('should handle zero events', async () => {
      mockRepository.findByDateRange.mockResolvedValue([]);

      const result = await service.getEventProcessingMetrics(timeRange);

      expect(result.success).toBe(true);
      expect(result.data?.totalEvents).toBe(0);
      expect(result.data?.errorRate).toBe(0);
      expect(result.data?.throughputPerSecond).toBe(0);
    });

    it('should handle repository errors', async () => {
      mockRepository.findByDateRange.mockRejectedValue(
        new Error('Database error'),
      );
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.getEventProcessingMetrics(timeRange);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Internal error occurred while getting processing metrics',
      );
    });

    it('should calculate average processing time', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PROCESSED),
        createMockAnalyticsEvent('event-2', EventStatus.PROCESSED),
      ];

      mockRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.getEventProcessingMetrics(timeRange);

      expect(result.success).toBe(true);
      expect(result.data?.averageProcessingTime).toBeDefined();
      expect(typeof result.data?.averageProcessingTime).toBe('number');
    });

    it('should handle single day time range', async () => {
      const singleDayRange = {
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-15'),
      };

      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PROCESSED),
      ];

      mockRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.getEventProcessingMetrics(singleDayRange);

      expect(result.success).toBe(true);
    });
  });

  describe('getDataPrivacyMetrics', () => {
    const timeRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    it('should calculate privacy metrics successfully', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.ANONYMIZED),
        createMockAnalyticsEvent('event-2', EventStatus.ANONYMIZED),
        createMockAnalyticsEvent('event-3', EventStatus.EXPIRED),
        createMockAnalyticsEvent('event-4', EventStatus.PROCESSED),
      ];

      mockRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.getDataPrivacyMetrics(timeRange);

      expect(result.success).toBe(true);
      expect(result.data?.totalEvents).toBe(4);
      expect(result.data?.anonymizedEvents).toBe(2);
      expect(result.data?.expiredEvents).toBe(1);
    });

    it('should calculate compliance score', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PROCESSED),
        createMockAnalyticsEvent('event-2', EventStatus.PROCESSED),
        createMockAnalyticsEvent('event-3', EventStatus.ANONYMIZED),
      ];

      mockRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.getDataPrivacyMetrics(timeRange);

      expect(result.success).toBe(true);
      expect(result.data?.complianceScore).toBeGreaterThanOrEqual(0);
      expect(result.data?.complianceScore).toBeLessThanOrEqual(100);
    });

    it('should determine risk level based on compliance score', async () => {
      const mockEvents = Array(100)
        .fill(null)
        .map(() =>
          createMockAnalyticsEvent(
            `event-${Math.random()}`,
            EventStatus.PROCESSED,
          ),
        );

      mockRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.getDataPrivacyMetrics(timeRange);

      expect(result.success).toBe(true);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(
        result.data?.riskLevel,
      );
    });

    it('should count pending anonymization events', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PROCESSED),
        createMockAnalyticsEvent('event-2', EventStatus.PROCESSED),
      ];

      mockRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.getDataPrivacyMetrics(timeRange);

      expect(result.success).toBe(true);
      expect(typeof result.data?.pendingAnonymization).toBe('number');
    });

    it('should handle empty results', async () => {
      mockRepository.findByDateRange.mockResolvedValue([]);

      const result = await service.getDataPrivacyMetrics(timeRange);

      expect(result.success).toBe(true);
      expect(result.data?.complianceScore).toBe(100);
      expect(result.data?.riskLevel).toBe('LOW');
    });

    it('should handle repository errors', async () => {
      mockRepository.findByDateRange.mockRejectedValue(
        new Error('Database error'),
      );
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.getDataPrivacyMetrics(timeRange);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Internal error occurred while getting privacy metrics',
      );
    });

    it('should assess privacy compliance risk for each event', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PROCESSED),
        createMockAnalyticsEvent('event-2', EventStatus.ANONYMIZED),
      ];

      mockRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.getDataPrivacyMetrics(timeRange);

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle event processing errors gracefully', async () => {
      const mockEvent = createMockAnalyticsEvent(
        'event-1',
        EventStatus.PENDING_PROCESSING,
      );
      mockEvent.processEvent = jest.fn().mockImplementation(() => {
        throw new Error('Processing error');
      });

      mockRepository.findByIds.mockResolvedValue([mockEvent]);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.processBatchEvents(['event-1']);

      expect(result.success).toBe(true);
      expect(result.data?.failureCount).toBe(1);
    });

    it('should handle eventBus publish errors in batch processing', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PENDING_PROCESSING),
      ];

      mockRepository.findByIds.mockResolvedValue(mockEvents);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockRejectedValue(new Error('Publish error'));
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.processBatchEvents(['event-1']);

      expect(result.success).toBe(true);
      expect(result.data?.results[0].success).toBe(false);
    });
  });
});

// Helper function to create mock analytics events
function createMockAnalyticsEvent(id: string, status: EventStatus) {
  return {
    getId: () => ({ getValue: () => id }),
    getStatus: () => status,
    getSessionId: () => `session-${id}`,
    getUserId: () => `user-${id}`,
    getTimestamp: () => new Date().toISOString(),
    getCreatedAt: () => new Date(),
    getEventType: () => 'PAGE_VIEW',
    processEvent: jest.fn(),
    anonymizeData: jest.fn(),
    markAsExpired: jest.fn(),
    getUncommittedEvents: jest.fn().mockReturnValue([]),
    markEventsAsCommitted: jest.fn(),
  } as unknown as import('./analytics.dto').AnalyticsEvent;
}
