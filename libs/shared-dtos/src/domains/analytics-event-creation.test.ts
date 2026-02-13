import { describe, beforeEach } from '@jest/globals';
import {
  AnalyticsEvent,
  EventType,
  EventStatus,
} from './analytics.dto';
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
        'PERCENTAGE',
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
