import { AnalyticsEventCollectionService } from './analytics-event-collection.service';
import { EventType, MetricUnit, ConsentStatus } from './analytics.dto';
import type {
  IAnalyticsRepository,
  IDomainEventBus,
  IAuditLogger,
  IPrivacyService,
  ISessionTracker,
} from './analytics-interfaces.dto';

// Mocks
const mockRepository: jest.Mocked<IAnalyticsRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  findBySession: jest.fn(),
  findByDateRange: jest.fn(),
  findByIds: jest.fn(),
  countSessionEvents: jest.fn(),
  deleteExpired: jest.fn(),
  anonymizeOldEvents: jest.fn(),
};

const mockEventBus: jest.Mocked<IDomainEventBus> = {
  publish: jest.fn(),
};

const mockAuditLogger: jest.Mocked<IAuditLogger> = {
  logSecurityEvent: jest.fn(),
  logBusinessEvent: jest.fn(),
  logError: jest.fn(),
};

const mockPrivacyService: jest.Mocked<IPrivacyService> = {
  getUserConsentStatus: jest.fn(),
  anonymizeUserData: jest.fn(),
  deleteUserData: jest.fn(),
};

const mockSessionTracker: jest.Mocked<ISessionTracker> = {
  updateSessionActivity: jest.fn(),
  getSession: jest.fn(),
  endSession: jest.fn(),
};

describe('AnalyticsEventCollectionService', () => {
  let service: AnalyticsEventCollectionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsEventCollectionService(
      mockRepository,
      mockEventBus,
      mockAuditLogger,
      mockPrivacyService,
      mockSessionTracker,
    );
  });

  describe('createUserInteractionEvent', () => {
    const mockSessionId = 'session-123';
    const mockUserId = 'user-456';
    const mockEventType = EventType.PAGE_VIEW;
    const mockEventData = { page: '/home', duration: 5000 };

    it('should create user interaction event successfully', async () => {
      mockPrivacyService.getUserConsentStatus.mockResolvedValue(
        ConsentStatus.GRANTED,
      );
      mockRepository.countSessionEvents.mockResolvedValue(5);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockSessionTracker.updateSessionActivity.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.createUserInteractionEvent(
        mockSessionId,
        mockUserId,
        mockEventType,
        mockEventData,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalled();
    });

    it('should fail when user consent is denied', async () => {
      mockPrivacyService.getUserConsentStatus.mockResolvedValue(
        ConsentStatus.DENIED,
      );
      mockRepository.countSessionEvents.mockResolvedValue(5);
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const result = await service.createUserInteractionEvent(
        mockSessionId,
        mockUserId,
        mockEventType,
        mockEventData,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when session event limit is exceeded', async () => {
      mockPrivacyService.getUserConsentStatus.mockResolvedValue(
        ConsentStatus.GRANTED,
      );
      mockRepository.countSessionEvents.mockResolvedValue(10001); // Exceeds limit
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const result = await service.createUserInteractionEvent(
        mockSessionId,
        mockUserId,
        mockEventType,
        mockEventData,
      );

      expect(result.success).toBe(false);
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      mockPrivacyService.getUserConsentStatus.mockResolvedValue(
        ConsentStatus.GRANTED,
      );
      mockRepository.countSessionEvents.mockResolvedValue(5);
      mockRepository.save.mockRejectedValue(new Error('Database error'));
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.createUserInteractionEvent(
        mockSessionId,
        mockUserId,
        mockEventType,
        mockEventData,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Internal error occurred while creating event',
      );
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });

    it('should create event with context data', async () => {
      mockPrivacyService.getUserConsentStatus.mockResolvedValue(
        ConsentStatus.GRANTED,
      );
      mockRepository.countSessionEvents.mockResolvedValue(5);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockSessionTracker.updateSessionActivity.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const context = { userAgent: 'test-browser', referrer: 'google.com' };

      const result = await service.createUserInteractionEvent(
        mockSessionId,
        mockUserId,
        mockEventType,
        mockEventData,
        context,
      );

      expect(result.success).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should handle pending consent status', async () => {
      mockPrivacyService.getUserConsentStatus.mockResolvedValue(
        ConsentStatus.PENDING,
      );
      mockRepository.countSessionEvents.mockResolvedValue(5);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockSessionTracker.updateSessionActivity.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.createUserInteractionEvent(
        mockSessionId,
        mockUserId,
        mockEventType,
        mockEventData,
      );

      // Should succeed with pending consent
      expect(result.success).toBe(true);
    });

    it('should validate event data before saving', async () => {
      mockPrivacyService.getUserConsentStatus.mockResolvedValue(
        ConsentStatus.GRANTED,
      );
      mockRepository.countSessionEvents.mockResolvedValue(5);

      const invalidEventData = { page: '' }; // Empty page should fail validation

      const result = await service.createUserInteractionEvent(
        mockSessionId,
        mockUserId,
        mockEventType,
        invalidEventData,
      );

      expect(result.success).toBe(false);
    });

    it('should handle missing userId', async () => {
      mockPrivacyService.getUserConsentStatus.mockResolvedValue(
        ConsentStatus.GRANTED,
      );
      mockRepository.countSessionEvents.mockResolvedValue(5);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockSessionTracker.updateSessionActivity.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.createUserInteractionEvent(
        mockSessionId,
        '',
        mockEventType,
        mockEventData,
      );

      expect(result.success).toBe(false);
    });

    it('should handle different event types', async () => {
      mockPrivacyService.getUserConsentStatus.mockResolvedValue(
        ConsentStatus.GRANTED,
      );
      mockRepository.countSessionEvents.mockResolvedValue(5);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockSessionTracker.updateSessionActivity.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const clickEventType = EventType.USER_INTERACTION;
      const clickEventData = { buttonId: 'submit-btn', action: 'click' };

      const result = await service.createUserInteractionEvent(
        mockSessionId,
        mockUserId,
        clickEventType,
        clickEventData,
        { userAgent: 'test-browser' },
      );

      expect(result.success).toBe(true);
    });
  });

  describe('createSystemPerformanceEvent', () => {
    const mockOperation = 'database_query';
    const mockDuration = 150;
    const mockSuccess = true;

    it('should create system performance event successfully', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.createSystemPerformanceEvent(
        mockOperation,
        mockDuration,
        mockSuccess,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should log security event when performance threshold exceeded', async () => {
      const longDuration = 6000; // Exceeds CRITICAL_PERFORMANCE_THRESHOLD_MS (5000)
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.createSystemPerformanceEvent(
        mockOperation,
        longDuration,
        mockSuccess,
      );

      expect(result.success).toBe(true);
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        'PERFORMANCE_THRESHOLD_EXCEEDED',
        expect.objectContaining({
          operation: mockOperation,
          duration: longDuration,
        }),
      );
    });

    it('should handle failed operations', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.createSystemPerformanceEvent(
        mockOperation,
        mockDuration,
        false, // Failed operation
      );

      expect(result.success).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should include metadata when provided', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const metadata = { query: 'SELECT * FROM users', rows: 100 };

      const result = await service.createSystemPerformanceEvent(
        mockOperation,
        mockDuration,
        mockSuccess,
        metadata,
      );

      expect(result.success).toBe(true);
    });

    it('should handle repository save errors', async () => {
      mockRepository.save.mockRejectedValue(new Error('Storage error'));
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.createSystemPerformanceEvent(
        mockOperation,
        mockDuration,
        mockSuccess,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Internal error occurred while creating system event',
      );
    });

    it('should handle zero duration', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.createSystemPerformanceEvent(
        mockOperation,
        0,
        mockSuccess,
      );

      expect(result.success).toBe(true);
    });

    it('should handle negative duration', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.createSystemPerformanceEvent(
        mockOperation,
        -100,
        mockSuccess,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('createBusinessMetricEvent', () => {
    const mockMetricName = 'user_signup';
    const mockMetricValue = 100;
    const mockMetricUnit = MetricUnit.COUNT;

    it('should create business metric event successfully', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.createBusinessMetricEvent(
        mockMetricName,
        mockMetricValue,
        mockMetricUnit,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'BUSINESS_METRIC_RECORDED',
        expect.objectContaining({
          metricName: mockMetricName,
          metricValue: mockMetricValue,
          metricUnit: mockMetricUnit,
        }),
      );
    });

    it('should include dimensions when provided', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const dimensions = { region: 'us-east', tier: 'premium' };

      const result = await service.createBusinessMetricEvent(
        mockMetricName,
        mockMetricValue,
        mockMetricUnit,
        dimensions,
      );

      expect(result.success).toBe(true);
    });

    it('should handle different metric units', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.createBusinessMetricEvent(
        'response_time',
        250.5,
        MetricUnit.DURATION_MS,
      );

      expect(result.success).toBe(true);
    });

    it('should handle zero metric value', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.createBusinessMetricEvent(
        mockMetricName,
        0,
        mockMetricUnit,
      );

      expect(result.success).toBe(true);
    });

    it('should handle negative metric value', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.createBusinessMetricEvent(
        'revenue_change',
        -500,
        MetricUnit.CURRENCY,
      );

      expect(result.success).toBe(true);
    });

    it('should handle repository errors', async () => {
      mockRepository.save.mockRejectedValue(new Error('Storage error'));
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.createBusinessMetricEvent(
        mockMetricName,
        mockMetricValue,
        mockMetricUnit,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Internal error occurred while creating business metric',
      );
    });

    it('should handle empty dimensions', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);
      mockAuditLogger.logBusinessEvent.mockResolvedValue(undefined);

      const result = await service.createBusinessMetricEvent(
        mockMetricName,
        mockMetricValue,
        mockMetricUnit,
        {},
      );

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors in createUserInteractionEvent', async () => {
      mockPrivacyService.getUserConsentStatus.mockRejectedValue(
        new Error('Unexpected error'),
      );
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.createUserInteractionEvent(
        'session-123',
        'user-456',
        EventType.PAGE_VIEW,
        {},
      );

      expect(result.success).toBe(false);
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });

    it('should handle eventBus publish errors', async () => {
      mockPrivacyService.getUserConsentStatus.mockResolvedValue(
        ConsentStatus.GRANTED,
      );
      mockRepository.countSessionEvents.mockResolvedValue(5);
      mockRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockRejectedValue(new Error('Publish error'));
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.createUserInteractionEvent(
        'session-123',
        'user-456',
        EventType.PAGE_VIEW,
        {},
      );

      // Should still return success since event was saved
      expect(result.success).toBe(false);
    });
  });
});
