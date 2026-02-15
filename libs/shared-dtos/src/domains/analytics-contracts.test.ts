import { describe, beforeEach, expect } from '@jest/globals';
import {
  AnalyticsEvent,
  EventType,
  MetricUnit,
} from './analytics.dto';
import {
  AnalyticsContracts,
  AnalyticsContractViolation,
} from '../contracts/analytics.contracts';
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
});
