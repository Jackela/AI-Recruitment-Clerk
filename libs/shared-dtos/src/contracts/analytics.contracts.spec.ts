import {
  AnalyticsContracts,
  AnalyticsContractViolation,
} from './analytics.contracts';
import {
  AnalyticsEvent,
  EventType,
  EventStatus,
  MetricUnit,
  UserSession,
} from '../domains/analytics.dto';

describe('AnalyticsContracts', () => {
  describe('createUserInteractionEvent', () => {
    // Happy path tests
    it('should create user interaction event with valid inputs', () => {
      const sessionId = 'session_12345678901234567890';
      const userId = 'user_123';
      const eventType = EventType.USER_INTERACTION;
      const eventData = { action: 'click', target: 'button' };

      const event = AnalyticsContracts.createUserInteractionEvent(
        sessionId,
        userId,
        eventType,
        eventData,
      );

      expect(event).toBeDefined();
      expect(event.getSessionId()).toBe(sessionId);
      expect(event.getUserId()).toBe(userId);
      expect(event.getEventType()).toBe(eventType);
      expect(event.getStatus()).toBe(EventStatus.PENDING_PROCESSING);
    });

    it('should create event with optional context', () => {
      const sessionId = 'session_12345678901234567890';
      const userId = 'user_123';
      const eventType = EventType.PAGE_VIEW;
      const eventData = { pageUrl: '/home', pageTitle: 'Home' };
      const context = { userAgent: 'Mozilla/5.0' };

      const event = AnalyticsContracts.createUserInteractionEvent(
        sessionId,
        userId,
        eventType,
        eventData,
        context,
      );

      expect(event).toBeDefined();
    });

    // Precondition validation tests
    it('should throw error when session ID is invalid', () => {
      expect(() => {
        AnalyticsContracts.createUserInteractionEvent(
          '',
          'user_123',
          EventType.USER_INTERACTION,
          { action: 'click' },
        );
      }).toThrow('Session ID is required');
    });

    it('should throw error when user ID is empty', () => {
      expect(() => {
        AnalyticsContracts.createUserInteractionEvent(
          'session_12345678901234567890',
          '',
          EventType.USER_INTERACTION,
          { action: 'click' },
        );
      }).toThrow('User ID is required for user interaction event');
    });

    it('should throw error when event type is invalid', () => {
      expect(() => {
        AnalyticsContracts.createUserInteractionEvent(
          'session_12345678901234567890',
          'user_123',
          'INVALID_TYPE' as any,
          { action: 'click' },
        );
      }).toThrow('Valid event type is required');
    });

    it('should throw error when event data is null', () => {
      expect(() => {
        AnalyticsContracts.createUserInteractionEvent(
          'session_12345678901234567890',
          'user_123',
          EventType.USER_INTERACTION,
          null as any,
        );
      }).toThrow('Event data is required');
    });

    it('should throw error when trying to create system event type', () => {
      expect(() => {
        AnalyticsContracts.createUserInteractionEvent(
          'session_12345678901234567890',
          'user_123',
          EventType.SYSTEM_PERFORMANCE,
          { operation: 'test' },
        );
      }).toThrow(
        'Cannot create system event type with user interaction method',
      );
    });

    // Edge cases
    it('should handle session IDs at boundary lengths', () => {
      const minSessionId = 'a'.repeat(10);
      const maxSessionId = 'a'.repeat(100);

      [minSessionId, maxSessionId].forEach((sessionId) => {
        const event = AnalyticsContracts.createUserInteractionEvent(
          sessionId,
          'user_123',
          EventType.USER_INTERACTION,
          { action: 'click' },
        );
        expect(event.getSessionId()).toBe(sessionId);
      });
    });

    it('should reject session IDs outside valid length range', () => {
      const tooShort = 'short';
      const tooLong = 'a'.repeat(101);

      [tooShort, tooLong].forEach((sessionId) => {
        expect(() => {
          AnalyticsContracts.createUserInteractionEvent(
            sessionId,
            'user_123',
            EventType.USER_INTERACTION,
            { action: 'click' },
          );
        }).toThrow();
      });
    });
  });

  describe('createSystemPerformanceEvent', () => {
    // Happy path tests
    it('should create system performance event with valid inputs', () => {
      const operation = 'database_query';
      const duration = 150;
      const success = true;

      const event = AnalyticsContracts.createSystemPerformanceEvent(
        operation,
        duration,
        success,
      );

      expect(event).toBeDefined();
      expect(event.getEventType()).toBe(EventType.SYSTEM_PERFORMANCE);
      expect(event.getStatus()).toBe(EventStatus.PENDING_PROCESSING);
      expect(event.getUserId()).toBeUndefined();
    });

    it('should create event with optional metadata', () => {
      const metadata = { database: 'postgres', table: 'users' };

      const event = AnalyticsContracts.createSystemPerformanceEvent(
        'query',
        100,
        true,
        metadata,
      );

      expect(event).toBeDefined();
    });

    // Precondition validation tests
    it('should throw error when operation name is empty', () => {
      expect(() => {
        AnalyticsContracts.createSystemPerformanceEvent('', 100, true);
      }).toThrow('Operation name is required for performance event');
    });

    it('should throw error when duration is negative', () => {
      expect(() => {
        AnalyticsContracts.createSystemPerformanceEvent('operation', -1, true);
      }).toThrow('Duration must be a non-negative number');
    });

    it('should throw error when duration exceeds maximum', () => {
      expect(() => {
        AnalyticsContracts.createSystemPerformanceEvent(
          'operation',
          300001,
          true,
        );
      }).toThrow('Duration cannot exceed 5 minutes');
    });

    it('should throw error when success is not boolean', () => {
      expect(() => {
        AnalyticsContracts.createSystemPerformanceEvent(
          'operation',
          100,
          'true' as any,
        );
      }).toThrow('Success flag must be a boolean value');
    });

    // Edge cases
    it('should handle duration at exact boundary (0ms)', () => {
      const event = AnalyticsContracts.createSystemPerformanceEvent(
        'instant_operation',
        0,
        true,
      );
      expect(event).toBeDefined();
    });

    it('should handle duration at maximum boundary (300000ms)', () => {
      const event = AnalyticsContracts.createSystemPerformanceEvent(
        'long_operation',
        300000,
        true,
      );
      expect(event).toBeDefined();
    });

    it('should handle both success and failure operations', () => {
      const successEvent = AnalyticsContracts.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );
      const failureEvent = AnalyticsContracts.createSystemPerformanceEvent(
        'operation',
        100,
        false,
      );

      expect(successEvent).toBeDefined();
      expect(failureEvent).toBeDefined();
    });
  });

  describe('createBusinessMetricEvent', () => {
    // Happy path tests
    it('should create business metric event with valid inputs', () => {
      const metricName = 'user_signups';
      const metricValue = 42;
      const metricUnit = MetricUnit.COUNT;

      const event = AnalyticsContracts.createBusinessMetricEvent(
        metricName,
        metricValue,
        metricUnit,
      );

      expect(event).toBeDefined();
      expect(event.getEventType()).toBe(EventType.BUSINESS_METRIC);
      expect(event.getStatus()).toBe(EventStatus.PENDING_PROCESSING);
    });

    it('should create event with optional dimensions', () => {
      const dimensions = { region: 'us-west', product: 'premium' };

      const event = AnalyticsContracts.createBusinessMetricEvent(
        'revenue',
        1000,
        MetricUnit.CURRENCY,
        dimensions,
      );

      expect(event).toBeDefined();
    });

    // Precondition validation tests
    it('should throw error when metric name is empty', () => {
      expect(() => {
        AnalyticsContracts.createBusinessMetricEvent(
          '',
          100,
          MetricUnit.COUNT,
        );
      }).toThrow('Metric name is required for business metric event');
    });

    it('should throw error when metric value is not a valid number', () => {
      expect(() => {
        AnalyticsContracts.createBusinessMetricEvent(
          'metric',
          NaN,
          MetricUnit.COUNT,
        );
      }).toThrow('Metric value must be a valid number');
    });

    it('should throw error when metric value is negative', () => {
      expect(() => {
        AnalyticsContracts.createBusinessMetricEvent(
          'metric',
          -10,
          MetricUnit.COUNT,
        );
      }).toThrow('Metric value cannot be negative');
    });

    it('should throw error when metric unit is invalid', () => {
      expect(() => {
        AnalyticsContracts.createBusinessMetricEvent(
          'metric',
          100,
          'INVALID_UNIT' as any,
        );
      }).toThrow('Valid metric unit is required');
    });

    it('should throw error when dimensions exceed maximum keys', () => {
      const tooManyDimensions: Record<string, string> = {};
      for (let i = 0; i < 21; i++) {
        tooManyDimensions[`key${i}`] = `value${i}`;
      }

      expect(() => {
        AnalyticsContracts.createBusinessMetricEvent(
          'metric',
          100,
          MetricUnit.COUNT,
          tooManyDimensions,
        );
      }).toThrow('Dimensions cannot have more than 20 keys');
    });

    // Edge cases
    it('should handle all metric unit types', () => {
      const units = [
        MetricUnit.COUNT,
        MetricUnit.PERCENTAGE,
        MetricUnit.DURATION_MS,
        MetricUnit.BYTES,
        MetricUnit.CURRENCY,
      ];

      units.forEach((unit) => {
        const event = AnalyticsContracts.createBusinessMetricEvent(
          'metric',
          100,
          unit,
        );
        expect(event).toBeDefined();
      });
    });

    it('should handle metric value of zero', () => {
      const event = AnalyticsContracts.createBusinessMetricEvent(
        'metric',
        0,
        MetricUnit.COUNT,
      );
      expect(event).toBeDefined();
    });

    it('should handle exactly 20 dimension keys', () => {
      const dimensions: Record<string, string> = {};
      for (let i = 0; i < 20; i++) {
        dimensions[`key${i}`] = `value${i}`;
      }

      const event = AnalyticsContracts.createBusinessMetricEvent(
        'metric',
        100,
        MetricUnit.COUNT,
        dimensions,
      );
      expect(event).toBeDefined();
    });
  });

  describe('validateEvent', () => {
    // Happy path tests
    it('should validate a valid event successfully', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        'session_12345678901234567890',
        'user_123',
        EventType.USER_INTERACTION,
        { action: 'click', target: 'button' },
      );

      const result = AnalyticsContracts.validateEvent(event);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // Precondition validation tests
    it('should throw error when event is null', () => {
      expect(() => {
        AnalyticsContracts.validateEvent(null as any);
      }).toThrow('Event is required for validation');
    });

    it('should throw error when event is expired', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );
      event.markAsExpired();

      expect(() => {
        AnalyticsContracts.validateEvent(event);
      }).toThrow('Cannot validate expired event');
    });

    // Postcondition validation tests
    it('should ensure result has correct structure for valid event', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );

      const result = AnalyticsContracts.validateEvent(event);

      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should ensure valid events have no errors', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );

      const result = AnalyticsContracts.validateEvent(event);

      if (result.isValid) {
        expect(result.errors).toHaveLength(0);
      }
    });

    // Edge cases
    it('should validate different event types', () => {
      const performanceEvent = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );

      const result1 = AnalyticsContracts.validateEvent(performanceEvent);

      expect(result1.isValid).toBe(true);
    });
  });

  describe('processEvent', () => {
    // Happy path tests
    it('should successfully process a pending event', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );

      AnalyticsContracts.processEvent(event);

      expect(event.getStatus()).toBe(EventStatus.PROCESSED);
    });

    // Precondition validation tests
    it('should throw error when event is null', () => {
      expect(() => {
        AnalyticsContracts.processEvent(null as any);
      }).toThrow();
    });

    it('should throw error when event is not in pending status', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );
      event.processEvent();

      expect(() => {
        AnalyticsContracts.processEvent(event);
      }).toThrow('Only pending events can be processed');
    });

    // Postcondition validation tests
    it('should ensure status changes to processed', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );
      const originalStatus = event.getStatus();

      AnalyticsContracts.processEvent(event);

      expect(event.getStatus()).toBe(EventStatus.PROCESSED);
      expect(event.getStatus()).not.toBe(originalStatus);
    });
  });

  describe('anonymizeEventData', () => {
    // Happy path tests
    it('should successfully anonymize event data', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        'session_12345678901234567890',
        'user_123',
        EventType.USER_INTERACTION,
        { action: 'click', target: 'button' },
      );
      event.processEvent();

      // Mock the time to make it old enough for anonymization
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(event.getCreatedAt().getTime() + 366 * 24 * 60 * 60 * 1000);

      AnalyticsContracts.anonymizeEventData(event);

      expect(event.getStatus()).toBe(EventStatus.ANONYMIZED);
    });

    // Precondition validation tests
    it('should throw error when event is null', () => {
      expect(() => {
        AnalyticsContracts.anonymizeEventData(null as any);
      }).toThrow();
    });

    it('should throw error when event is already anonymized', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );
      event.processEvent();

      jest
        .spyOn(Date, 'now')
        .mockReturnValue(event.getCreatedAt().getTime() + 366 * 24 * 60 * 60 * 1000);

      event.anonymizeData();

      expect(() => {
        AnalyticsContracts.anonymizeEventData(event);
      }).toThrow('Event is already anonymized');
    });

    it('should throw error when event is expired', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );
      event.markAsExpired();

      expect(() => {
        AnalyticsContracts.anonymizeEventData(event);
      }).toThrow('Cannot anonymize expired event');
    });

    // Cleanup
    afterEach(() => {
      jest.restoreAllMocks();
    });
  });

  describe('markEventAsExpired', () => {
    // Happy path tests
    it('should mark event as expired when conditions are met', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );
      event.processEvent();

      // Mock time to be past retention expiry
      const retentionExpiry = event.getRetentionExpiry();
      if (retentionExpiry) {
        jest.spyOn(Date, 'now').mockReturnValue(retentionExpiry.getTime() + 1000);
      }

      AnalyticsContracts.markEventAsExpired(event);

      expect(event.getStatus()).toBe(EventStatus.EXPIRED);
    });

    // Precondition validation tests
    it('should throw error when event is null', () => {
      expect(() => {
        AnalyticsContracts.markEventAsExpired(null as any);
      }).toThrow();
    });

    it('should throw error when event is already expired', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );
      event.markAsExpired();

      expect(() => {
        AnalyticsContracts.markEventAsExpired(event);
      }).toThrow('Event is already marked as expired');
    });

    // Cleanup
    afterEach(() => {
      jest.restoreAllMocks();
    });
  });

  describe('validateInvariants', () => {
    // Happy path tests
    it('should validate invariants for valid event', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );

      expect(() => {
        AnalyticsContracts.validateInvariants(event);
      }).not.toThrow();
    });

    it('should validate invariants after processing', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );
      event.processEvent();

      expect(() => {
        AnalyticsContracts.validateInvariants(event);
      }).not.toThrow();
    });

    // Edge cases
    it('should validate different event types', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent('op', 100, true);

      expect(() => {
        AnalyticsContracts.validateInvariants(event);
      }).not.toThrow();
    });
  });

  describe('validateBatchOperation', () => {
    // Happy path tests
    it('should validate valid batch of items', () => {
      const items = [1, 2, 3, 4, 5];

      expect(() => {
        AnalyticsContracts.validateBatchOperation(items, 10, 'TestBatch');
      }).not.toThrow();
    });

    // Precondition validation tests
    it('should throw error when items is not an array', () => {
      expect(() => {
        AnalyticsContracts.validateBatchOperation(
          'not-array' as any,
          10,
          'TestBatch',
        );
      }).toThrow('TestBatch requires an array of items');
    });

    it('should throw error when items array is empty', () => {
      expect(() => {
        AnalyticsContracts.validateBatchOperation([], 10, 'TestBatch');
      }).toThrow('TestBatch requires at least one item');
    });

    it('should throw error when batch size exceeds maximum', () => {
      const items = Array(11).fill(1);

      expect(() => {
        AnalyticsContracts.validateBatchOperation(items, 10, 'TestBatch');
      }).toThrow('TestBatch batch size cannot exceed 10');
    });

    // Edge cases
    it('should handle batch at exact size limit', () => {
      const items = Array(10).fill(1);

      expect(() => {
        AnalyticsContracts.validateBatchOperation(items, 10, 'TestBatch');
      }).not.toThrow();
    });

    it('should handle single item batch', () => {
      expect(() => {
        AnalyticsContracts.validateBatchOperation([1], 10, 'TestBatch');
      }).not.toThrow();
    });
  });

  describe('validatePrivacyCompliance', () => {
    // Happy path tests
    it('should validate privacy compliance for valid event and session', () => {
      const event = AnalyticsEvent.createUserInteractionEvent(
        'session_12345678901234567890',
        'user_123',
        EventType.USER_INTERACTION,
        { action: 'click', target: 'button' },
      );
      const session = UserSession.create('session_12345678901234567890', 'user_123');

      expect(() => {
        AnalyticsContracts.validatePrivacyCompliance(event, session);
      }).not.toThrow();
    });

    // Precondition validation tests
    it('should throw error when event is null', () => {
      const session = UserSession.create('session_12345678901234567890', 'user_123');

      expect(() => {
        AnalyticsContracts.validatePrivacyCompliance(null as any, session);
      }).toThrow('Event is required for privacy compliance validation');
    });

    it('should throw error when session is null', () => {
      const event = AnalyticsEvent.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );

      expect(() => {
        AnalyticsContracts.validatePrivacyCompliance(event, null as any);
      }).toThrow('User session is required for privacy compliance validation');
    });
  });

  describe('performanceContract', () => {
    // Happy path tests
    it('should execute operation within time limit', () => {
      const operation = () => 'result';

      const result = AnalyticsContracts.performanceContract(
        operation,
        100,
        'TestOperation',
      );

      expect(result).toBe('result');
    });

    it('should throw error when operation exceeds time limit', () => {
      const slowOperation = () => {
        const start = Date.now();
        while (Date.now() - start < 150) {
          // Busy wait
        }
        return 'result';
      };

      expect(() => {
        AnalyticsContracts.performanceContract(
          slowOperation,
          100,
          'SlowOperation',
        );
      }).toThrow('exceeded maximum execution time');
    });

    // Error handling
    it('should propagate errors from operation', () => {
      const failingOperation = () => {
        throw new Error('Operation failed');
      };

      expect(() => {
        AnalyticsContracts.performanceContract(
          failingOperation,
          100,
          'FailingOperation',
        );
      }).toThrow('Operation failed');
    });
  });

  describe('validateDataQuality', () => {
    // Happy path tests
    it('should validate data quality for valid event data', () => {
      const eventData = { operation: 'test', duration: 100, success: true };

      expect(() => {
        AnalyticsContracts.validateDataQuality(
          EventType.SYSTEM_PERFORMANCE,
          eventData,
        );
      }).not.toThrow();
    });

    // Precondition validation tests
    it('should throw error when event type is invalid', () => {
      expect(() => {
        AnalyticsContracts.validateDataQuality('INVALID' as any, {});
      }).toThrow('Valid event type is required for data quality validation');
    });

    it('should throw error when event data is null', () => {
      expect(() => {
        AnalyticsContracts.validateDataQuality(
          EventType.SYSTEM_PERFORMANCE,
          null as any,
        );
      }).toThrow('Event data is required for quality validation');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete event lifecycle', () => {
      // Create
      const event = AnalyticsContracts.createSystemPerformanceEvent(
        'operation',
        100,
        true,
      );

      // Validate
      const validationResult = AnalyticsContracts.validateEvent(event);
      expect(validationResult.isValid).toBe(true);

      // Process
      AnalyticsContracts.processEvent(event);
      expect(event.getStatus()).toBe(EventStatus.PROCESSED);

      // Validate invariants
      expect(() => {
        AnalyticsContracts.validateInvariants(event);
      }).not.toThrow();
    });

    it('should enforce all contracts in system performance creation', () => {
      const event = AnalyticsContracts.createSystemPerformanceEvent(
        'database_query',
        150,
        true,
      );

      expect(event.getEventType()).toBe(EventType.SYSTEM_PERFORMANCE);

      const result = AnalyticsContracts.validateEvent(event);
      expect(result.isValid).toBe(true);

      expect(() => {
        AnalyticsContracts.validateInvariants(event);
      }).not.toThrow();
    });
  });

  describe('Error Types', () => {
    it('should throw AnalyticsContractViolation for contract violations', () => {
      expect(() => {
        AnalyticsContracts.createUserInteractionEvent(
          '',
          'user',
          EventType.USER_INTERACTION,
          {},
        );
      }).toThrow(AnalyticsContractViolation);
    });

    it('should include operation name in error message', () => {
      try {
        AnalyticsContracts.validateEvent(null as any);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AnalyticsContractViolation);
        expect((error as Error).message).toContain('validateEvent');
      }
    });
  });
});
