import { describe, beforeEach } from '@jest/globals';
import {
  AnalyticsEvent,
  EventType,
  EventStatus,
  ConsentStatus,
} from './analytics.dto';
import { AnalyticsRules } from './analytics.rules';
import {
  validSessionId,
  validUserId,
  validEventData,
  validUserSession,
  domainService,
  clearAllMocks,
} from './analytics-test-helpers';

describe('Agent-5: Analytics Domain Service Tests', () => {
  beforeEach(() => {
    clearAllMocks();
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
});
