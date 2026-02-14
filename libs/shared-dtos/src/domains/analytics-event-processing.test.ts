import { describe, beforeEach, expect } from '@jest/globals';
import {
  AnalyticsEvent,
  EventType,
  EventStatus,
} from './analytics.dto';
import {
  validSessionId,
  validUserId,
  validEventData,
  clearAllMocks,
} from './analytics-test-helpers';

describe('Agent-5: Analytics Domain Service Tests', () => {
  beforeEach(() => {
    clearAllMocks();
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
});
