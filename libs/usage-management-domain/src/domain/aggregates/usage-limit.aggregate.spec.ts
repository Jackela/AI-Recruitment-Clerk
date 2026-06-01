import { UsageLimit } from '../domain/aggregates/usage-limit.aggregate';
import { UsageLimitPolicy } from '../domain/value-objects/usage-limit-policy.value-object';
import { BonusType } from '../application/dtos/usage-limit.dto';

describe('UsageLimit Aggregate', () => {
  const mockPolicy = UsageLimitPolicy.create({
    dailyLimit: 5,
    bonusEnabled: true,
    maxBonusQuota: 10,
    resetTimeUTC: 0,
  });

  describe('create', () => {
    it('should create usage limit with valid data', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);

      expect(usageLimit).toBeDefined();
      expect(usageLimit.getIP()).toBe('192.168.1.1');
      expect(usageLimit.getCurrentUsage()).toBe(0);
      expect(usageLimit.getAvailableQuota()).toBe(5);
    });

    it('should emit UsageLimitCreatedEvent', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);
      const events = usageLimit.getUncommittedEvents();

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].eventName).toBe('usage-limit.created');
    });

    it('should generate unique IDs for each usage limit', () => {
      const limit1 = UsageLimit.create('192.168.1.1', mockPolicy);
      const limit2 = UsageLimit.create('192.168.1.2', mockPolicy);

      expect(limit1.getId().getValue()).not.toBe(limit2.getId().getValue());
    });
  });

  describe('canUse', () => {
    it('should allow usage when quota available', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);
      const result = usageLimit.canUse();

      expect(result.isAllowed()).toBe(true);
      expect(result.getRemainingQuota()).toBe(5);
    });

    it('should block usage when quota exhausted', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);

      // Use all quota
      for (let i = 0; i < 5; i++) {
        usageLimit.recordUsage();
      }

      const result = usageLimit.canUse();
      expect(result.isAllowed()).toBe(false);
      expect(result.getBlockReason()).toContain('Daily usage limit reached');
    });

    it('should emit UsageLimitExceededEvent when blocked', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);

      for (let i = 0; i < 5; i++) {
        usageLimit.recordUsage();
      }
      usageLimit.markEventsAsCommitted();

      usageLimit.canUse();
      const events = usageLimit.getUncommittedEvents();
      const exceededEvent = events.find(
        (e) => e.eventName === 'usage-limit.exceeded',
      );

      expect(exceededEvent).toBeDefined();
    });
  });

  describe('recordUsage', () => {
    it('should record usage successfully', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);
      const result = usageLimit.recordUsage();

      expect(result.isSuccess()).toBe(true);
      expect(result.getCurrentCount()).toBe(1);
      expect(usageLimit.getCurrentUsage()).toBe(1);
    });

    it('should emit UsageRecordedEvent on successful record', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);
      usageLimit.recordUsage();

      const events = usageLimit.getUncommittedEvents();
      const recordedEvent = events.find(
        (e) => e.eventName === 'usage-limit.recorded',
      );

      expect(recordedEvent).toBeDefined();
    });

    it('should fail to record when quota exhausted', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);

      for (let i = 0; i < 5; i++) {
        usageLimit.recordUsage();
      }

      const result = usageLimit.recordUsage();
      expect(result.isSuccess()).toBe(false);
      expect(result.getError()).toContain('Usage limit exceeded');
    });

    it('should track multiple usages correctly', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);

      usageLimit.recordUsage();
      expect(usageLimit.getCurrentUsage()).toBe(1);

      usageLimit.recordUsage();
      expect(usageLimit.getCurrentUsage()).toBe(2);

      usageLimit.recordUsage();
      expect(usageLimit.getCurrentUsage()).toBe(3);
    });
  });

  describe('addBonusQuota', () => {
    it('should add bonus quota successfully', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);
      const initialQuota = usageLimit.getAvailableQuota();

      usageLimit.addBonusQuota(BonusType.QUESTIONNAIRE, 5);

      expect(usageLimit.getAvailableQuota()).toBe(initialQuota + 5);
    });

    it('should emit BonusQuotaAddedEvent', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);
      usageLimit.addBonusQuota(BonusType.QUESTIONNAIRE, 5);

      const events = usageLimit.getUncommittedEvents();
      const bonusEvent = events.find(
        (e) => e.eventName === 'usage-limit.bonus-quota-added',
      );

      expect(bonusEvent).toBeDefined();
    });

    it('should throw error for non-positive bonus amount', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);

      expect(() => {
        usageLimit.addBonusQuota(BonusType.QUESTIONNAIRE, 0);
      }).toThrow('Bonus quota amount must be positive');

      expect(() => {
        usageLimit.addBonusQuota(BonusType.QUESTIONNAIRE, -5);
      }).toThrow('Bonus quota amount must be positive');
    });

    it('should handle multiple bonus types', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);

      usageLimit.addBonusQuota(BonusType.QUESTIONNAIRE, 3);
      usageLimit.addBonusQuota(BonusType.PAYMENT, 5);
      usageLimit.addBonusQuota(BonusType.REFERRAL, 2);

      expect(usageLimit.getAvailableQuota()).toBe(15);
    });
  });

  describe('daily reset', () => {
    it('should reset usage on new day', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const usageLimit = UsageLimit.restore({
        id: 'test-id',
        ip: '192.168.1.1',
        policy: {
          dailyLimit: 5,
          bonusEnabled: true,
          maxBonusQuota: 10,
          resetTimeUTC: 0,
        },
        quotaAllocation: {
          baseQuota: 5,
          bonusQuota: 0,
          bonusBreakdown: [],
        },
        usageTracking: {
          currentCount: 3,
          usageHistory: [],
          lastUsageAt: yesterday,
        },
        lastResetAt: yesterday.toISOString(),
      });

      usageLimit.recordUsage();
      expect(usageLimit.getCurrentUsage()).toBe(0);
    });

    it('should emit DailyUsageResetEvent on reset', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const usageLimit = UsageLimit.restore({
        id: 'test-id',
        ip: '192.168.1.1',
        policy: {
          dailyLimit: 5,
          bonusEnabled: true,
          maxBonusQuota: 10,
          resetTimeUTC: 0,
        },
        quotaAllocation: {
          baseQuota: 5,
          bonusQuota: 0,
          bonusBreakdown: [],
        },
        usageTracking: {
          currentCount: 3,
          usageHistory: [],
        },
        lastResetAt: yesterday.toISOString(),
      });

      usageLimit.markEventsAsCommitted();
      usageLimit.recordUsage();

      const events = usageLimit.getUncommittedEvents();
      const resetEvent = events.find(
        (e) => e.eventName === 'usage-limit.daily-reset',
      );

      expect(resetEvent).toBeDefined();
    });
  });

  describe('getUsageStatistics', () => {
    it('should return current usage statistics', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);
      usageLimit.recordUsage();
      usageLimit.recordUsage();

      const stats = usageLimit.getUsageStatistics();

      expect(stats.currentUsage).toBe(2);
      expect(stats.dailyLimit).toBe(5);
      expect(stats.availableQuota).toBe(3);
    });

    it('should include IP in statistics', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);
      const stats = usageLimit.getUsageStatistics();

      expect(stats.ip).toBe('192.168.1.1');
    });

    it('should include next reset time', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);
      const stats = usageLimit.getUsageStatistics();

      expect(stats.resetAt).toBeInstanceOf(Date);
      expect(stats.resetAt.getHours()).toBe(0);
      expect(stats.resetAt.getMinutes()).toBe(0);
    });
  });

  describe('event management', () => {
    it('should mark events as committed', () => {
      const usageLimit = UsageLimit.create('192.168.1.1', mockPolicy);

      expect(usageLimit.getUncommittedEvents().length).toBeGreaterThan(0);
      usageLimit.markEventsAsCommitted();
      expect(usageLimit.getUncommittedEvents()).toHaveLength(0);
    });
  });

  describe('restore', () => {
    it('should restore usage limit from data', () => {
      const data = {
        id: 'test-id-123',
        ip: '192.168.1.1',
        policy: {
          dailyLimit: 10,
          bonusEnabled: true,
          maxBonusQuota: 20,
          resetTimeUTC: 0,
        },
        quotaAllocation: {
          baseQuota: 10,
          bonusQuota: 5,
          bonusBreakdown: [['questionnaire', 5]],
        },
        usageTracking: {
          currentCount: 3,
          usageHistory: [{ timestamp: new Date().toISOString(), count: 1 }],
          lastUsageAt: new Date().toISOString(),
        },
        lastResetAt: new Date().toISOString(),
      };

      const restored = UsageLimit.restore(data);

      expect(restored.getId().getValue()).toBe('test-id-123');
      expect(restored.getIP()).toBe('192.168.1.1');
      expect(restored.getCurrentUsage()).toBe(3);
      expect(restored.getAvailableQuota()).toBe(12);
    });
  });
});
