import { describe, beforeEach, expect } from '@jest/globals';
import {
  AnalyticsEvent,
  EventType,
  ConsentStatus,
} from './analytics.dto';
import { AnalyticsRules } from './analytics.rules';
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
});
