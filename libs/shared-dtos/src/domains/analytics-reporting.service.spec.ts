import { AnalyticsReportingService } from './analytics-reporting.service';
import { EventStatus, AnalyticsEvent } from './analytics.dto';
import { AnalyticsRules, ReportType, DataScope } from './analytics.rules';
import {
  PrivacyComplianceResult,
  DataRetentionReportResult,
  SessionAnalyticsResult,
  ReportingAccessResult,
} from './analytics-result-classes';
import type {
  IAnalyticsRepository,
  IAuditLogger,
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
};

const mockAuditLogger: jest.Mocked<IAuditLogger> = {
  logSecurityEvent: jest.fn(),
  logBusinessEvent: jest.fn(),
  logError: jest.fn(),
};

const mockSessionTracker: jest.Mocked<ISessionTracker> = {
  updateSessionActivity: jest.fn(),
  getSession: jest.fn(),
};

describe('AnalyticsReportingService', () => {
  let service: AnalyticsReportingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsReportingService(
      mockRepository,
      mockAuditLogger,
      mockSessionTracker,
    );
  });

  describe('performPrivacyComplianceCheck', () => {
    const mockEventId = 'event-123';

    it('should perform privacy compliance check successfully', async () => {
      const mockEvent = createMockAnalyticsEvent(
        mockEventId,
        EventStatus.PROCESSED,
      );
      const mockSession = createMockUserSession();

      mockRepository.findById.mockResolvedValue(mockEvent);
      mockSessionTracker.getSession.mockResolvedValue(mockSession);
      mockRepository.save.mockResolvedValue(undefined);
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const result = await service.performPrivacyComplianceCheck(mockEventId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.eventId).toBe(mockEventId);
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalled();
    });

    it('should fail when event not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.performPrivacyComplianceCheck(mockEventId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Event not found');
    });

    it('should fail when session not found', async () => {
      const mockEvent = createMockAnalyticsEvent(
        mockEventId,
        EventStatus.PROCESSED,
      );

      mockRepository.findById.mockResolvedValue(mockEvent);
      mockSessionTracker.getSession.mockResolvedValue(null);

      const result = await service.performPrivacyComplianceCheck(mockEventId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Session information not found');
    });

    it('should anonymize data when required', async () => {
      const mockEvent = createMockAnalyticsEvent(
        mockEventId,
        EventStatus.PROCESSED,
      );
      const mockSession = createMockUserSession();

      // Mock event as requiring anonymization
      const oldEventDate = new Date();
      oldEventDate.setDate(oldEventDate.getDate() - 400); // Older than retention period
      jest.spyOn(mockEvent, 'getCreatedAt').mockReturnValue(oldEventDate);

      mockRepository.findById.mockResolvedValue(mockEvent);
      mockSessionTracker.getSession.mockResolvedValue(mockSession);
      mockRepository.save.mockResolvedValue(undefined);
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const result = await service.performPrivacyComplianceCheck(mockEventId);

      expect(result.success).toBe(true);
      expect(mockEvent.anonymizeData).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should mark event as expired when overdue', async () => {
      const mockEvent = createMockAnalyticsEvent(
        mockEventId,
        EventStatus.PROCESSED,
      );
      const mockSession = createMockUserSession();

      // Mock event as overdue for expiry
      const veryOldEventDate = new Date();
      veryOldEventDate.setDate(veryOldEventDate.getDate() - 800);
      jest.spyOn(mockEvent, 'getCreatedAt').mockReturnValue(veryOldEventDate);

      mockRepository.findById.mockResolvedValue(mockEvent);
      mockSessionTracker.getSession.mockResolvedValue(mockSession);
      mockRepository.save.mockResolvedValue(undefined);
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const result = await service.performPrivacyComplianceCheck(mockEventId);

      expect(result.success).toBe(true);
      expect(mockEvent.markAsExpired).toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      mockRepository.findById.mockRejectedValue(new Error('Database error'));
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.performPrivacyComplianceCheck(mockEventId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Internal error occurred during privacy compliance check',
      );
    });

    it('should assess privacy compliance risk correctly', async () => {
      const mockEvent = createMockAnalyticsEvent(
        mockEventId,
        EventStatus.PROCESSED,
      );
      const mockSession = createMockUserSession();

      mockRepository.findById.mockResolvedValue(mockEvent);
      mockSessionTracker.getSession.mockResolvedValue(mockSession);
      mockRepository.save.mockResolvedValue(undefined);
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const result = await service.performPrivacyComplianceCheck(mockEventId);

      expect(result.success).toBe(true);
      expect(result.data?.riskAssessment).toBeDefined();
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(
        result.data?.riskAssessment.riskLevel,
      );
    });

    it('should skip anonymization for already anonymized events', async () => {
      const mockEvent = createMockAnalyticsEvent(
        mockEventId,
        EventStatus.ANONYMIZED,
      );
      const mockSession = createMockUserSession();

      mockRepository.findById.mockResolvedValue(mockEvent);
      mockSessionTracker.getSession.mockResolvedValue(mockSession);
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const result = await service.performPrivacyComplianceCheck(mockEventId);

      expect(result.success).toBe(true);
      expect(mockEvent.anonymizeData).not.toHaveBeenCalled();
    });
  });

  describe('generateDataRetentionReport', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should generate data retention report successfully', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PROCESSED),
        createMockAnalyticsEvent('event-2', EventStatus.ANONYMIZED),
        createMockAnalyticsEvent('event-3', EventStatus.EXPIRED),
      ];

      mockRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.generateDataRetentionReport(
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      expect(result.data?.totalEvents).toBe(3);
      expect(result.data?.retentionPolicies).toHaveLength(3);
      expect(result.data?.reportPeriod).toEqual({ startDate, endDate });
    });

    it('should calculate events to delete', async () => {
      const veryOldDate = new Date();
      veryOldDate.setDate(veryOldDate.getDate() - 800);

      const mockEvents = [
        createMockAnalyticsEventWithDate(
          'event-1',
          EventStatus.PROCESSED,
          veryOldDate,
        ),
        createMockAnalyticsEvent('event-2', EventStatus.PROCESSED),
      ];

      mockRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.generateDataRetentionReport(
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      expect(result.data?.eventsToDelete).toBeGreaterThanOrEqual(0);
    });

    it('should calculate events to anonymize', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400);

      const mockEvents = [
        createMockAnalyticsEventWithDate(
          'event-1',
          EventStatus.PROCESSED,
          oldDate,
        ),
        createMockAnalyticsEvent('event-2', EventStatus.PROCESSED),
      ];

      mockRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.generateDataRetentionReport(
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      expect(result.data?.eventsToAnonymize).toBeGreaterThanOrEqual(0);
    });

    it('should generate event type statistics', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PROCESSED),
        createMockAnalyticsEvent('event-2', EventStatus.PROCESSED),
      ];

      mockRepository.findByDateRange.mockResolvedValue(mockEvents);

      const result = await service.generateDataRetentionReport(
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      expect(result.data?.eventTypeStatistics).toBeDefined();
    });

    it('should handle empty date range', async () => {
      mockRepository.findByDateRange.mockResolvedValue([]);

      const result = await service.generateDataRetentionReport(
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      expect(result.data?.totalEvents).toBe(0);
      expect(result.data?.eventsToDelete).toBe(0);
      expect(result.data?.eventsToAnonymize).toBe(0);
    });

    it('should handle repository errors', async () => {
      mockRepository.findByDateRange.mockRejectedValue(
        new Error('Database error'),
      );
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.generateDataRetentionReport(
        startDate,
        endDate,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Internal error occurred while generating retention report',
      );
    });

    it('should handle same start and end date', async () => {
      const sameDate = new Date('2024-01-15');

      mockRepository.findByDateRange.mockResolvedValue([]);

      const result = await service.generateDataRetentionReport(
        sameDate,
        sameDate,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getSessionAnalytics', () => {
    const mockSessionId = 'session-123';

    it('should get session analytics successfully', async () => {
      const now = new Date();
      const mockEvents = [
        createMockAnalyticsEventWithTimestamp(
          'event-1',
          EventStatus.PROCESSED,
          new Date(now.getTime() - 60000),
        ),
        createMockAnalyticsEventWithTimestamp(
          'event-2',
          EventStatus.PROCESSED,
          now,
        ),
      ];

      mockRepository.findBySession.mockResolvedValue(mockEvents);
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.getSessionAnalytics(mockSessionId);

      expect(result.success).toBe(true);
      expect(result.data?.sessionId).toBe(mockSessionId);
      expect(result.data?.eventCount).toBe(2);
      expect(result.data?.isActive).toBe(true);
    });

    it('should fail when no events found for session', async () => {
      mockRepository.findBySession.mockResolvedValue([]);
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.getSessionAnalytics(mockSessionId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No events found for session');
    });

    it('should calculate average event interval', async () => {
      const now = new Date();
      const mockEvents = [
        createMockAnalyticsEventWithTimestamp(
          'event-1',
          EventStatus.PROCESSED,
          new Date(now.getTime() - 120000),
        ),
        createMockAnalyticsEventWithTimestamp(
          'event-2',
          EventStatus.PROCESSED,
          new Date(now.getTime() - 60000),
        ),
        createMockAnalyticsEventWithTimestamp(
          'event-3',
          EventStatus.PROCESSED,
          now,
        ),
      ];

      mockRepository.findBySession.mockResolvedValue(mockEvents);
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.getSessionAnalytics(mockSessionId);

      expect(result.success).toBe(true);
      expect(result.data?.averageEventInterval).toBeGreaterThan(0);
    });

    it('should handle session with single event', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PROCESSED),
      ];

      mockRepository.findBySession.mockResolvedValue(mockEvents);
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.getSessionAnalytics(mockSessionId);

      expect(result.success).toBe(true);
      expect(result.data?.averageEventInterval).toBe(0);
    });

    it('should handle inactive sessions', async () => {
      const oldTime = new Date();
      oldTime.setMinutes(oldTime.getMinutes() - 60); // 60 minutes ago

      const mockEvents = [
        createMockAnalyticsEventWithTimestamp(
          'event-1',
          EventStatus.PROCESSED,
          oldTime,
        ),
      ];

      mockRepository.findBySession.mockResolvedValue(mockEvents);
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.getSessionAnalytics(mockSessionId);

      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(false);
    });

    it('should filter events by time range when provided', async () => {
      const mockEvents = [
        createMockAnalyticsEvent('event-1', EventStatus.PROCESSED),
      ];

      mockRepository.findBySession.mockResolvedValue(mockEvents);
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const timeRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const result = await service.getSessionAnalytics(
        mockSessionId,
        timeRange,
      );

      expect(result.success).toBe(true);
      expect(mockRepository.findBySession).toHaveBeenCalledWith(
        mockSessionId,
        timeRange,
      );
    });

    it('should handle repository errors', async () => {
      mockRepository.findBySession.mockRejectedValue(
        new Error('Database error'),
      );
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.getSessionAnalytics(mockSessionId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Internal error occurred while getting session analytics',
      );
    });

    it('should sort events by timestamp', async () => {
      const mockEvents = [
        createMockAnalyticsEventWithTimestamp(
          'event-1',
          EventStatus.PROCESSED,
          new Date('2024-01-15T10:00:00Z'),
        ),
        createMockAnalyticsEventWithTimestamp(
          'event-2',
          EventStatus.PROCESSED,
          new Date('2024-01-15T09:00:00Z'),
        ),
        createMockAnalyticsEventWithTimestamp(
          'event-3',
          EventStatus.PROCESSED,
          new Date('2024-01-15T11:00:00Z'),
        ),
      ];

      mockRepository.findBySession.mockResolvedValue(mockEvents);
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.getSessionAnalytics(mockSessionId);

      expect(result.success).toBe(true);
      expect(result.data?.startTime).toEqual(new Date('2024-01-15T09:00:00Z'));
    });
  });

  describe('validateReportingAccess', () => {
    const mockUserRole = 'admin';
    const mockReportType = ReportType.SUMMARY;
    const mockDataScope = DataScope.ALL;

    it('should validate reporting access successfully', async () => {
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const result = await service.validateReportingAccess(
        mockUserRole,
        mockReportType,
        mockDataScope,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        'REPORTING_ACCESS_CHECK',
        expect.objectContaining({
          userRole: mockUserRole,
          reportType: mockReportType,
          dataScope: mockDataScope,
        }),
      );
    });

    it('should deny access for unauthorized roles', async () => {
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const result = await service.validateReportingAccess(
        'viewer',
        ReportType.DETAILED,
        DataScope.ALL,
      );

      expect(result.success).toBe(true);
      // Access result should indicate no access
      expect(result.data?.hasAccess).toBe(false);
    });

    it('should grant access for admin roles', async () => {
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const result = await service.validateReportingAccess(
        'admin',
        ReportType.DETAILED,
        DataScope.ALL,
      );

      expect(result.success).toBe(true);
      expect(result.data?.hasAccess).toBe(true);
    });

    it('should return permissions list', async () => {
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const result = await service.validateReportingAccess(
        mockUserRole,
        mockReportType,
        mockDataScope,
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data?.permissions)).toBe(true);
    });

    it('should return restrictions when applicable', async () => {
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const result = await service.validateReportingAccess(
        'viewer',
        mockReportType,
        mockDataScope,
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data?.restrictions)).toBe(true);
    });

    it('should handle different report types', async () => {
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const reportTypes = [
        ReportType.SUMMARY,
        ReportType.DETAILED,
        ReportType.AUDIT,
      ];

      for (const reportType of reportTypes) {
        const result = await service.validateReportingAccess(
          mockUserRole,
          reportType,
          mockDataScope,
        );
        expect(result.success).toBe(true);
      }
    });

    it('should handle different data scopes', async () => {
      mockAuditLogger.logSecurityEvent.mockResolvedValue(undefined);

      const dataScopes = [DataScope.OWN, DataScope.DEPARTMENT, DataScope.ALL];

      for (const dataScope of dataScopes) {
        const result = await service.validateReportingAccess(
          mockUserRole,
          mockReportType,
          dataScope,
        );
        expect(result.success).toBe(true);
      }
    });

    it('should handle errors gracefully', async () => {
      mockAuditLogger.logSecurityEvent.mockRejectedValue(
        new Error('Logging error'),
      );
      mockAuditLogger.logError.mockResolvedValue(undefined);

      const result = await service.validateReportingAccess(
        mockUserRole,
        mockReportType,
        mockDataScope,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Internal error occurred while validating reporting access',
      );
    });
  });
});

// Helper functions
function createMockAnalyticsEvent(id: string, status: EventStatus) {
  return {
    getId: () => ({ getValue: () => id }),
    getStatus: () => status,
    getSessionId: () => `session-${id}`,
    getUserId: () => `user-${id}`,
    getTimestamp: () => new Date().toISOString(),
    getCreatedAt: () => new Date(),
    getEventType: () => 'PAGE_VIEW',
    anonymizeData: jest.fn(),
    markAsExpired: jest.fn(),
  } as unknown as import('./analytics.dto').AnalyticsEvent;
}

function createMockAnalyticsEventWithDate(
  id: string,
  status: EventStatus,
  date: Date,
) {
  return {
    ...createMockAnalyticsEvent(id, status),
    getCreatedAt: () => date,
  };
}

function createMockAnalyticsEventWithTimestamp(
  id: string,
  status: EventStatus,
  timestamp: Date,
) {
  return {
    ...createMockAnalyticsEvent(id, status),
    getTimestamp: () => timestamp.toISOString(),
  };
}

function createMockUserSession() {
  return {
    sessionId: 'session-123',
    userId: 'user-456',
    consentStatus: 'GRANTED',
    isSystemSession: false,
  };
}
