import { describe, beforeEach } from '@jest/globals';
import {
  AnalyticsEventId,
  EventType,
  EventStatus,
  ConsentStatus,
  MetricUnit,
  UserSession,
  DeviceInfo,
  GeoLocation,
  EventData,
  EventTimestamp,
  EventContext,
} from './analytics.dto';
import { ReportType, DataScope } from './analytics.rules';
import {
  AnalyticsContracts,
  AnalyticsContractViolation,
} from '../contracts/analytics.contracts';
import { AnalyticsDomainService } from './analytics.service';
import {
  validSessionId,
  validUserId,
  validDeviceInfo,
  validGeoLocation,
  validUserSession,
  validEventData,
  domainService,
  clearAllMocks,
} from './analytics-test-helpers';

describe('Agent-5: Analytics Domain Service Tests', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe('1. Analytics Event Creation', () => {
    it('should create user interaction event successfully', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
        { pageUrl: '/questionnaire' },
      );

      expect(event).toBeDefined();
      expect(event.getId().getValue()).toMatch(/^analytics_/);
      expect(event.getSessionId()).toBe(validSessionId);
      expect(event.getUserId()).toBe(validUserId);
      expect(event.getEventType()).toBe(EventType.USER_INTERACTION);
      expect(event.getStatus()).toBe(EventStatus.PENDING_PROCESSING);
    });

    it('should create system performance event successfully', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'database_query',
        150,
        true,
        { queryType: 'SELECT', tableName: 'users' },
      );

      expect(event).toBeDefined();
      expect(event.getId().getValue()).toMatch(/^analytics_/);
      expect(event.getEventType()).toBe(EventType.SYSTEM_PERFORMANCE);
      expect(event.getStatus()).toBe(EventStatus.PENDING_PROCESSING);
      expect(event.getUserId()).toBeUndefined(); // System events don't have user IDs
    });

    it('should create business metric event successfully', () => {
      const event = AnalyticsEvent.createBusinessMetricEvent(
        'questionnaire_completion_rate',
        85.5,
        MetricUnit.PERCENTAGE,
        { source: 'ai_recruitment', period: 'daily' },
      );

      expect(event).toBeDefined();
      expect(event.getId().getValue()).toMatch(/^analytics_/);
      expect(event.getEventType()).toBe(EventType.BUSINESS_METRIC);
      expect(event.getStatus()).toBe(EventStatus.PENDING_PROCESSING);
    });

    it('should generate unique IDs for different events', () => {
      const event1 = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );
      const event2 = AnalyticsEvent.createSystemPerformanceEvent(
        'api_call',
        200,
        true,
      );

      expect(event1.getId().getValue()).not.toBe(event2.getId().getValue());
    });

    it('should publish domain events on creation', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      const events = event.getUncommittedEvents();
      expect(events.length).toBeGreaterThan(0);

      const createdEvent = events.find(
        (e) => e.constructor.name === 'AnalyticsEventCreatedEvent',
      );
      expect(createdEvent).toBeDefined();
    });
  });

  describe('2. Event Validation', () => {
    it('should validate event successfully', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      const result = event.validateEvent();
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect validation errors in event data', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        '', // Invalid session ID
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      const result = event.validateEvent();
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Session ID is required');
    });

    it('should publish validation events', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      event.markEventsAsCommitted(); // Clear creation events
      event.validateEvent();

      const events = event.getUncommittedEvents();
      const validationEvent = events.find(
        (e) => e.constructor.name === 'AnalyticsEventValidatedEvent',
      );
      expect(validationEvent).toBeDefined();
    });
  });

  describe('3. Event Processing', () => {
    it('should process event successfully', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      expect(event.getStatus()).toBe(EventStatus.PENDING_PROCESSING);
      event.processEvent();
      expect(event.getStatus()).toBe(EventStatus.PROCESSED);
    });

    it('should throw error when processing non-pending event', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      event.processEvent(); // First processing
      expect(() => {
        event.processEvent(); // Second processing attempt
      }).toThrow('Cannot process event in processed status');
    });

    it('should set retention expiry when processing', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      expect(event.getRetentionExpiry()).toBeUndefined();
      event.processEvent();
      expect(event.getRetentionExpiry()).toBeDefined();
      expect(event.getRetentionExpiry()!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('4. Privacy and Compliance Assessment', () => {
    it('should anonymize event data successfully', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      // Process event first to set retention expiry
      event.processEvent();
      // Mock old creation date to trigger anonymization requirement
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400);
      Object.defineProperty(event, 'createdAt', { value: oldDate });
      event.anonymizeData();
      expect(event.getStatus()).toBe(EventStatus.ANONYMIZED);
    });

    it('should mark event as expired', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      event.markAsExpired();
      expect(event.getStatus()).toBe(EventStatus.EXPIRED);
    });

    it('should not anonymize already anonymized event', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      event.processEvent();
      // Mock old creation date
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400);
      Object.defineProperty(event, 'createdAt', { value: oldDate });
      event.anonymizeData(); // First anonymization
      expect(() => {
        event.anonymizeData(); // Second anonymization attempt
      }).toThrow('Event data is already anonymized');
    });
  });

  describe('5. Business Rules Validation', () => {
    it('should validate event creation eligibility', () => {
      const result = AnalyticsRules.canCreateEvent(
        validSessionId,
        EventType.USER_INTERACTION,
        validEventData,
        ConsentStatus.GRANTED,
        5, // Existing events in session
      );

      expect(result.isEligible).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.priority.level).toBeDefined();
    });

    it('should reject when session event limit exceeded', () => {
      const result = AnalyticsRules.canCreateEvent(
        validSessionId,
        EventType.USER_INTERACTION,
        validEventData,
        ConsentStatus.GRANTED,
        1000, // At session limit
      );

      expect(result.isEligible).toBe(false);
      expect(result.errors).toContain('Session event limit exceeded (1000 events max)');
    });

    it('should reject when user consent is missing', () => {
      const result = AnalyticsRules.canCreateEvent(
        validSessionId,
        EventType.USER_INTERACTION,
        validEventData,
        ConsentStatus.DENIED,
        5,
      );

      expect(result.isEligible).toBe(false);
      expect(result.errors).toContain('Valid user consent is required for this event type');
    });

    it('should validate event data structure correctly', () => {
      const validResult = AnalyticsRules.validateEventDataStructure(
        EventType.USER_INTERACTION,
        {
          action: 'click',
          target: 'button',
        },
      );

      expect(validResult.isValid).toBe(true);
      expect(validResult.errors.length).toBe(0);
    });

    it('should calculate event priority correctly', () => {
      const errorPriority = AnalyticsRules.calculateEventPriority(EventType.ERROR_EVENT);
      const interactionPriority = AnalyticsRules.calculateEventPriority(EventType.USER_INTERACTION);

      expect(errorPriority.score).toBeGreaterThan(interactionPriority.score);
      expect(errorPriority.level).toBe('CRITICAL');
      expect(errorPriority.factors).toContain('Critical error event');
    });

    it('should validate batch processing eligibility', () => {
      const events = [
        AnalyticsEvent.createUserInteractionEvent(
          validSessionId,
          validUserId,
          EventType.USER_INTERACTION,
          validEventData,
        ),
        AnalyticsEvent.createSystemPerformanceEvent('test_op', 100, true),
      ];

      const result = AnalyticsRules.canBatchProcessEvents(events);
      expect(result.isEligible).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.eligibleEventCount).toBe(2);
    });
  });

  describe('6. Privacy and Compliance Assessment Extended', () => {
    it('should generate data retention policy correctly', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      const policy = AnalyticsRules.generateRetentionPolicy(event);
      expect(policy.eventId).toBe(event.getId().getValue());
      expect(policy.retentionExpiry).toBeInstanceOf(Date);
      expect(policy.anonymizationThreshold).toBeInstanceOf(Date);
      expect(policy.daysUntilExpiry).toBeGreaterThan(0);
      expect(Array.isArray(policy.recommendedActions)).toBe(true);
    });

    it('should assess privacy compliance risk correctly', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      const assessment = AnalyticsRules.assessPrivacyComplianceRisk(
        event,
        validUserSession,
      );

      expect(assessment.eventId).toBe(event.getId().getValue());
      expect(assessment.sessionId).toBe(validSessionId);
      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskLevel).toBeDefined();
      expect(Array.isArray(assessment.riskFactors)).toBe(true);
      expect(Array.isArray(assessment.recommendedActions)).toBe(true);
    });

    it('should validate anonymization requirement', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      // Mock recent creation date
      const recentResult = AnalyticsRules.validateAnonymizationRequirement(event);
      expect(recentResult.isRequired).toBe(false);
      expect(recentResult.urgency).toBe('LOW');

      // Mock old creation date
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400);
      Object.defineProperty(event, 'createdAt', { value: oldDate });
      const oldResult = AnalyticsRules.validateAnonymizationRequirement(event);
      expect(oldResult.isRequired).toBe(true);
      expect(oldResult.urgency).toBe('CRITICAL');
    });

    it('should calculate reporting permissions correctly', () => {
      const adminResult = AnalyticsRules.calculateReportingPermissions(
        'admin',
        ReportType.USER_BEHAVIOR,
        DataScope.FULL_ACCESS,
      );

      expect(adminResult.hasAccess).toBe(true);
      expect(adminResult.permissions).toContain('full_access');

      const viewerResult = AnalyticsRules.calculateReportingPermissions(
        'viewer',
        ReportType.USER_BEHAVIOR,
        DataScope.ANONYMIZED_ONLY,
      );

      expect(viewerResult.hasAccess).toBe(true);
      expect(viewerResult.restrictions).toContain('cannot_export_data');
    });
  });

  describe('7. Contract-based Programming', () => {
    it('should enforce preconditions in user interaction event creation', () => {
      expect(() => {
        AnalyticsContracts.createUserInteractionEvent(
          '', // Invalid session ID
          validUserId,
          EventType.USER_INTERACTION,
          validEventData,
        );
      }).toThrow(AnalyticsContractViolation);
    });

    it('should enforce preconditions in performance event creation', () => {
      expect(() => {
        AnalyticsContracts.createSystemPerformanceEvent(
          'test_op',
          -100, // Invalid negative duration
          true,
        );
      }).toThrow(AnalyticsContractViolation);
    });

    it('should enforce preconditions in business metric creation', () => {
      expect(() => {
        AnalyticsContracts.createBusinessMetricEvent(
          'test_metric',
          -50, // Invalid negative value
          MetricUnit.COUNT,
        );
      }).toThrow(AnalyticsContractViolation);
    });

    it('should validate invariants', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      expect(() => {
        AnalyticsContracts.validateInvariants(event);
      }).not.toThrow();
    });

    it('should enforce preconditions in event processing', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      // Process once
      AnalyticsContracts.processEvent(event);
      // Try to process again
      expect(() => {
        AnalyticsContracts.processEvent(event);
      }).toThrow(AnalyticsContractViolation);
    });

    it('should validate performance contracts', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      expect(() => {
        AnalyticsContracts.performanceContract(
          () => event.getEventSummary(),
          100, // 100ms limit
          'getEventSummary',
        );
      }).not.toThrow();
    });
  });

  describe('8. Domain Service Integration', () => {
    it('should create domain service successfully', () => {
      expect(domainService).toBeDefined();
    });

    it('should create user interaction event through service', async () => {
      mockRepository.save.mockResolvedValue(undefined);

      const result = await domainService.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
        { pageUrl: '/questionnaire' },
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.sessionId).toBe(validSessionId);
      expect(result.data!.userId).toBe(validUserId);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalledWith(
        'USER_EVENT_CREATED',
        expect.objectContaining({
          sessionId: validSessionId,
          userId: validUserId,
          eventType: EventType.USER_INTERACTION,
        }),
      );
    });

    it('should handle event creation failure', async () => {
      mockPrivacyService.getUserConsentStatus.mockResolvedValue(ConsentStatus.DENIED);

      const result = await domainService.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Valid user consent is required for this event type',
      );
    });

    it('should create system performance event through service', async () => {
      mockRepository.save.mockResolvedValue(undefined);

      const result = await domainService.createSystemPerformanceEvent(
        'database_query',
        150,
        true,
        { queryType: 'SELECT', tableName: 'users' },
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.eventType).toBe(EventType.SYSTEM_PERFORMANCE);
    });

    it('should create business metric event through service', async () => {
      mockRepository.save.mockResolvedValue(undefined);

      const result = await domainService.createBusinessMetricEvent(
        'completion_rate',
        85.5,
        MetricUnit.PERCENTAGE,
        { source: 'questionnaire' },
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.eventType).toBe(EventType.BUSINESS_METRIC);
    });

    it('should process batch events through service', async () => {
      const event1 = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );
      const event2 = AnalyticsEvent.createSystemPerformanceEvent('test', 100, true);

      mockRepository.findByIds.mockResolvedValue([event1, event2]);
      mockRepository.save.mockResolvedValue(undefined);

      const result = await domainService.processBatchEvents([
        event1.getId().getValue(),
        event2.getId().getValue(),
      ]);

      expect(result.success).toBe(true);
      expect(result.data?.totalEvents).toBe(2);
      expect(result.data?.successCount).toBe(2);
      expect(result.data?.failureCount).toBe(0);
    });

    it('should perform privacy compliance check', async () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      mockRepository.findById.mockResolvedValue(event);
      mockRepository.save.mockResolvedValue(undefined);

      const result = await domainService.performPrivacyComplianceCheck(
        event.getId().getValue(),
      );

      expect(result.success).toBe(true);
      expect(result.data?.eventId).toBe(event.getId().getValue());
      expect(result.data?.complianceStatus).toBeDefined();
    });

    it('should handle service errors gracefully', async () => {
      // Setup valid consent but database error
      mockPrivacyService.getUserConsentStatus.mockResolvedValue(ConsentStatus.GRANTED);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      const result = await domainService.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Internal error occurred while creating event',
      );
      expect(mockAuditLogger.logError).toHaveBeenCalled();
    });
  });

  describe('9. Value Objects', () => {
    it('should create valid AnalyticsEventId', () => {
      const id = AnalyticsEventId.generate();
      expect(id.getValue()).toMatch(/^analytics_/);
    });

    it('should create valid UserSession', () => {
      const session = UserSession.create(
        validSessionId,
        validUserId,
        validDeviceInfo,
        validGeoLocation,
      );

      expect(session.getSessionId()).toBe(validSessionId);
      expect(session.getUserId()).toBe(validUserId);
      expect(session.hasValidConsent()).toBe(true);
      expect(session.isValid()).toBe(true);
    });

    it('should detect invalid session', () => {
      const session = UserSession.create('', undefined); // Invalid session
      expect(session.isValid()).toBe(false);

      const errors = session.getValidationErrors();
      expect(errors).toContain('Session ID is required');
      expect(errors).toContain('User ID is required for user sessions');
    });

    it('should create and validate device info', () => {
      expect(validDeviceInfo.isValid()).toBe(true);

      const invalidDeviceInfo = new DeviceInfo({
        userAgent: '',
        screenResolution: '',
        language: '',
        timezone: '',
      });
      expect(invalidDeviceInfo.isValid()).toBe(false);
    });

    it('should create and validate geo location', () => {
      expect(validGeoLocation.isValid()).toBe(true);

      const invalidGeoLocation = new GeoLocation({
        country: '',
        region: '',
        city: '',
      });
      expect(invalidGeoLocation.isValid()).toBe(false);
    });

    it('should validate event data correctly', () => {
      const eventData = EventData.create(
        EventType.USER_INTERACTION,
        validEventData,
      );

      expect(eventData.getEventType()).toBe(EventType.USER_INTERACTION);
      expect(eventData.isValid()).toBe(true);
      expect(eventData.getValidationErrors()).toEqual([]);
    });

    it('should create and validate timestamps', () => {
      const timestamp = EventTimestamp.now('UTC');
      expect(timestamp.isValid()).toBe(true);
      expect(timestamp.toISOString()).toBeDefined();
      expect(timestamp.getValidationErrors()).toEqual([]);
    });

    it('should create and validate event context', () => {
      const context = EventContext.create({
        pageUrl: '/test',
        referrer: 'https://example.com',
        dimensions: { source: 'web' },
        metadata: { version: '1.0' },
      });

      expect(context.isValid()).toBe(true);
      expect(context.getValidationErrors()).toEqual([]);
    });
  });

  describe('10. System Integration Tests', () => {
    it('should generate data retention report', async () => {
      const events = [
        AnalyticsEvent.createUserInteractionEvent(
          validSessionId,
          validUserId,
          EventType.USER_INTERACTION,
          validEventData,
        ),
        AnalyticsEvent.createSystemPerformanceEvent('test', 100, true),
      ];

      mockRepository.findByDateRange.mockResolvedValue(events);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const result = await domainService.generateDataRetentionReport(
        startDate,
        endDate,
      );

      expect(result.success).toBe(true);
      expect(result.data?.totalEvents).toBe(2);
      expect(result.data?.retentionPolicies).toBeDefined();
    });

    it('should get session analytics', async () => {
      const events = [
        AnalyticsEvent.createUserInteractionEvent(
          validSessionId,
          validUserId,
          EventType.USER_INTERACTION,
          validEventData,
        ),
        AnalyticsEvent.createUserInteractionEvent(
          validSessionId,
          validUserId,
          EventType.PAGE_VIEW,
          { pageUrl: '/test' },
        ),
      ];

      mockRepository.findBySession.mockResolvedValue(events);

      const result = await domainService.getSessionAnalytics(validSessionId);

      expect(result.success).toBe(true);
      expect(result.data?.sessionId).toBe(validSessionId);
      expect(result.data?.eventCount).toBe(2);
      expect(result.data?.isActive).toBeDefined();
    });

    it('should get event processing metrics', async () => {
      const event1 = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );
      const event2 = AnalyticsEvent.createSystemPerformanceEvent('test', 100, true);

      event1.processEvent();
      event2.processEvent();

      mockRepository.findByDateRange.mockResolvedValue([event1, event2]);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await domainService.getEventProcessingMetrics({
        startDate,
        endDate,
      });

      expect(result.success).toBe(true);
      expect(result.data?.totalEvents).toBe(2);
      expect(result.data?.processedEvents).toBe(2);
      expect(result.data?.errorRate).toBe(0);
    });

    it('should get data privacy metrics', async () => {
      const event1 = AnalyticsEvent.createUserInteractionEvent(
        validSessionId,
        validUserId,
        EventType.USER_INTERACTION,
        validEventData,
      );
      const event2 = AnalyticsEvent.createSystemPerformanceEvent('test', 100, true);

      mockRepository.findByDateRange.mockResolvedValue([event1, event2]);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const result = await domainService.getDataPrivacyMetrics({
        startDate,
        endDate,
      });

      expect(result.success).toBe(true);
      expect(result.data?.totalEvents).toBe(2);
      expect(result.data?.complianceScore).toBeGreaterThanOrEqual(0);
      expect(result.data?.riskLevel).toBeDefined();
    });

    it('should validate reporting access', async () => {
      const result = await domainService.validateReportingAccess(
        'admin',
        ReportType.USER_BEHAVIOR,
        DataScope.FULL_ACCESS,
      );

      expect(result.success).toBe(true);
      expect(result.data?.hasAccess).toBe(true);
      expect(result.data?.permissions).toBeDefined();
      expect(result.data?.restrictions).toBeDefined();
    });
  });
});
