import { describe, beforeEach } from '@jest/globals';
import {
  AnalyticsEvent,
  EventType,
  EventStatus,
} from './analytics.dto';
import {
  validSessionId,
  validUserId,
  validEventData,
  domainService,
  clearAllMocks,
} from './analytics-test-helpers';

describe('Agent-5: Analytics Domain Service Tests', () => {
  beforeEach(() => {
    clearAllMocks();
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
});
