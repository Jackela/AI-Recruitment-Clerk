import {
  UserSession,
  SessionStatus,
  UsageQuota,
  SessionValidationService,
} from '../user-management.dto';
import { UserSessionRules } from '../user-management.rules';
import { UserSessionContracts } from '../../contracts/user-session.contracts';

describe('UserSession Domain Model', () => {
  describe('Session Creation', () => {
    it('should create valid session with correct IP', () => {
      // Given: valid IP address
      const ip = '192.168.1.1';

      // When: creating session
      const session = UserSession.create(ip);

      // Then: session should be valid with initial quota
      expect(session.isValid()).toBe(true);
      expect(session.getDailyUsage().remaining).toBe(5);
      expect(session.canUse()).toBe(true);
      expect(session.getStatus()).toBe(SessionStatus.ACTIVE);
    });

    it('should throw error for invalid IP format', () => {
      // Given: invalid IP address
      const invalidIP = 'not-an-ip';

      // When & Then: should throw contract violation
      expect(() => UserSession.create(invalidIP)).toThrow(
        'IP address must be valid IPv4 format',
      );
    });

    it('should throw error for empty IP', () => {
      // Given: empty IP
      const emptyIP = '';

      // When & Then: should throw error
      expect(() => UserSession.create(emptyIP)).toThrow(
        'IP address must be valid IPv4 format',
      );
    });

    it('should initialize session with correct default quota', () => {
      // Given: valid IP
      const ip = '10.0.0.1';

      // When: creating session
      const session = UserSession.create(ip);
      const usage = session.getDailyUsage();

      // Then: should have correct initial values
      expect(usage.used).toBe(0);
      expect(usage.total).toBe(5);
      expect(usage.remaining).toBe(5);
    });

    it('should generate unique session ID', () => {
      // Given: same IP
      const ip = '192.168.1.1';

      // When: creating multiple sessions
      const session1 = UserSession.create(ip);
      const session2 = UserSession.create(ip);

      // Then: should have different IDs
      expect(session1.getId().getValue()).not.toBe(session2.getId().getValue());
    });
  });

  describe('Usage Recording', () => {
    it('should record usage successfully for valid session', () => {
      // Given: valid session
      const session = UserSession.create('192.168.1.1');

      // When: recording usage
      const result = session.recordUsage();

      // Then: should succeed and update counters
      expect(result.success).toBe(true);
      expect(result.data?.used).toBe(1);
      expect(result.data?.remaining).toBe(4);
      expect(session.getDailyUsage().used).toBe(1);
    });

    it('should fail usage recording when quota exhausted', () => {
      // Given: session with exhausted quota
      const session = UserSession.create('192.168.1.1');
      for (let i = 0; i < 5; i++) {
        session.recordUsage();
      }

      // When: attempting to record usage
      const result = session.recordUsage();

      // Then: should fail
      expect(result.success).toBe(false);
      expect(result.quotaExceeded).toBe(true);
      expect(result.error).toBe('Usage quota exceeded');
    });

    it('should increment usage count correctly', () => {
      // Given: fresh session
      const session = UserSession.create('10.0.0.1');

      // When: recording multiple usages
      session.recordUsage();
      session.recordUsage();
      session.recordUsage();

      // Then: count should be correct
      const usage = session.getDailyUsage();
      expect(usage.used).toBe(3);
      expect(usage.remaining).toBe(2);
    });
  });

  describe('Quota Management', () => {
    it('should calculate daily quota correctly', () => {
      // Given: session with default quota
      const session = UserSession.create('192.168.1.1');

      // When: getting usage stats
      const usage = session.getDailyUsage();

      // Then: should have correct calculations
      expect(usage.total).toBe(5);
      expect(usage.used).toBe(0);
      expect(usage.remaining).toBe(5);
    });

    it('should handle quota with bonuses (future implementation)', () => {
      // Given: quota with bonuses
      const quota = UsageQuota.createDefault()
        .addQuestionnaireBonus()
        .addPaymentBonus();

      // When: checking total limit
      const totalLimit = quota.getTotalLimit();

      // Then: should include bonuses
      expect(totalLimit).toBe(15); // 5 + 5 + 5
    });

    it('should calculate remaining quota correctly after usage', () => {
      // Given: session with some usage
      const session = UserSession.create('192.168.1.1');
      session.recordUsage();
      session.recordUsage();

      // When: checking remaining quota
      const remaining = session.getDailyUsage().remaining;

      // Then: should be correct
      expect(remaining).toBe(3);
    });
  });

  describe('Session State Management', () => {
    it('should expire session correctly', () => {
      // Given: valid session
      const session = UserSession.create('192.168.1.1');

      // When: expiring session
      session.expire();

      // Then: should be expired and invalid
      expect(session.getStatus()).toBe(SessionStatus.EXPIRED);
      expect(session.isValid()).toBe(false);
      expect(session.canUse()).toBe(false);
    });

    it('should validate session state correctly', () => {
      // Given: fresh session
      const session = UserSession.create('192.168.1.1');

      // When: checking validity
      const isValid = session.isValid();

      // Then: should be valid
      expect(isValid).toBe(true);
    });

    it('should handle session restoration', () => {
      // Given: session data
      const sessionData = {
        id: 'session_123',
        ip: '192.168.1.1',
        status: SessionStatus.ACTIVE,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        quota: {
          daily: 5,
          used: 2,
          questionnaireBonuses: 0,
          paymentBonuses: 0,
        },
      };

      // When: restoring session
      const session = UserSession.restore(sessionData);

      // Then: should have correct state
      expect(session.getId().getValue()).toBe('session_123');
      expect(session.getDailyUsage().used).toBe(2);
      expect(session.getDailyUsage().remaining).toBe(3);
    });
  });

  describe('Business Rules', () => {
    it('should respect daily free limit rule', () => {
      // Given: session and business rules
      const session = UserSession.create('192.168.1.1');

      // When: checking if can use service
      const canUse = UserSessionRules.canUseService(session);

      // Then: should be allowed
      expect(canUse).toBe(true);
    });

    it('should calculate remaining quota using rules', () => {
      // Given: session with usage
      const session = UserSession.create('192.168.1.1');
      session.recordUsage();
      session.recordUsage();

      // When: calculating remaining quota
      const remaining = UserSessionRules.calculateRemainingQuota(session);

      // Then: should be correct
      expect(remaining).toBe(3);
    });

    it('should check daily limit correctly', () => {
      // Given: usage counts
      const withinLimit = UserSessionRules.isWithinDailyLimit(3);
      const atLimit = UserSessionRules.isWithinDailyLimit(5);

      // When & Then: should validate correctly
      expect(withinLimit).toBe(true);
      expect(atLimit).toBe(false);
    });
  });

  describe('Contract Validation', () => {
    it('should validate preconditions for session creation', () => {
      // Given: invalid IP
      const invalidIP = 'not-an-ip';

      // When & Then: should throw contract violation
      expect(() => UserSessionContracts.createSession(invalidIP)).toThrow(
        'IP address must be valid IPv4 format',
      );
    });

    it('should validate postconditions for session creation', () => {
      // Given: valid IP
      const ip = '192.168.1.1';

      // When: creating session
      const session = UserSessionContracts.createSession(ip);

      // Then: should meet postconditions
      expect(session.isValid()).toBe(true);
      expect(session.getDailyUsage().remaining).toBeGreaterThanOrEqual(0);
    });

    it('should validate preconditions for usage recording', () => {
      // Given: expired session
      const session = UserSession.create('192.168.1.1');
      session.expire();

      // When & Then: should throw contract violation
      expect(() => UserSessionContracts.recordUsage(session)).toThrow(
        'Can only record usage for valid sessions with available quota',
      );
    });

    it('should validate postconditions for usage recording', () => {
      // Given: valid session
      const session = UserSession.create('192.168.1.1');

      // When: recording usage
      const result = UserSessionContracts.recordUsage(session);

      // Then: should meet postconditions
      expect(result.success || result.quotaExceeded).toBe(true);
    });
  });

  describe('Domain Events', () => {
    it('should emit SessionCreatedEvent on creation', () => {
      // Given: IP address
      const ip = '192.168.1.1';

      // When: creating session
      const session = UserSession.create(ip);
      const events = session.getUncommittedEvents();

      // Then: should emit creation event
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(
        expect.objectContaining({
          sessionId: session.getId().getValue(),
          ip: ip,
        }),
      );
    });

    it('should emit UsageRecordedEvent on usage', () => {
      // Given: session
      const session = UserSession.create('192.168.1.1');
      session.markEventsAsCommitted(); // Clear creation event

      // When: recording usage
      session.recordUsage();
      const events = session.getUncommittedEvents();

      // Then: should emit usage event
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(
        expect.objectContaining({
          sessionId: session.getId().getValue(),
          usageCount: 1,
          remainingQuota: 4,
        }),
      );
    });

    it('should emit SessionExpiredEvent on expiration', () => {
      // Given: session
      const session = UserSession.create('192.168.1.1');
      session.markEventsAsCommitted(); // Clear creation event

      // When: expiring session
      session.expire();
      const events = session.getUncommittedEvents();

      // Then: should emit expiration event
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(
        expect.objectContaining({
          sessionId: session.getId().getValue(),
        }),
      );
    });

    it('should manage event lifecycle correctly', () => {
      // Given: session with events
      const session = UserSession.create('192.168.1.1');
      expect(session.getUncommittedEvents()).toHaveLength(1);

      // When: marking events as committed
      session.markEventsAsCommitted();

      // Then: should clear uncommitted events
      expect(session.getUncommittedEvents()).toHaveLength(0);
    });
  });

  describe('Domain Service', () => {
    it('should validate session correctly', () => {
      // Given: validation service and session
      const service = new SessionValidationService();
      const session = UserSession.create('192.168.1.1');

      // When: validating session
      const result = service.validate(session);

      // Then: should be valid
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid session', () => {
      // Given: expired session
      const service = new SessionValidationService();
      const session = UserSession.create('192.168.1.1');
      session.expire();

      // When: validating session
      const result = service.validate(session);

      // Then: should be invalid
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
