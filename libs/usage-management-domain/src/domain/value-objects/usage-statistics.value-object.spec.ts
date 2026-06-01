import { UsageStatistics } from './usage-statistics.value-object';

describe('UsageStatistics', () => {
  const createStats = (overrides = {}) => {
    return new UsageStatistics({
      ip: '192.168.1.1',
      currentUsage: 3,
      dailyLimit: 5,
      availableQuota: 2,
      bonusQuota: 0,
      resetAt: new Date(),
      lastActivityAt: new Date(),
      ...overrides,
    });
  };

  describe('constructor', () => {
    it('should create usage statistics with all properties', () => {
      const resetAt = new Date();
      const lastActivityAt = new Date();
      const stats = new UsageStatistics({
        ip: '10.0.0.1',
        currentUsage: 2,
        dailyLimit: 10,
        availableQuota: 8,
        bonusQuota: 5,
        resetAt,
        lastActivityAt,
      });

      expect(stats.props.ip).toBe('10.0.0.1');
      expect(stats.props.currentUsage).toBe(2);
      expect(stats.props.dailyLimit).toBe(10);
      expect(stats.props.availableQuota).toBe(8);
      expect(stats.props.bonusQuota).toBe(5);
      expect(stats.props.resetAt).toBe(resetAt);
      expect(stats.props.lastActivityAt).toBe(lastActivityAt);
    });
  });

  describe('ip getter', () => {
    it('should return ip', () => {
      const stats = createStats({ ip: '172.16.0.1' });
      expect(stats.ip).toBe('172.16.0.1');
    });
  });

  describe('currentUsage getter', () => {
    it('should return current usage', () => {
      const stats = createStats({ currentUsage: 7 });
      expect(stats.currentUsage).toBe(7);
    });
  });

  describe('dailyLimit getter', () => {
    it('should return daily limit', () => {
      const stats = createStats({ dailyLimit: 20 });
      expect(stats.dailyLimit).toBe(20);
    });
  });

  describe('availableQuota getter', () => {
    it('should return available quota', () => {
      const stats = createStats({ availableQuota: 15 });
      expect(stats.availableQuota).toBe(15);
    });
  });

  describe('bonusQuota getter', () => {
    it('should return bonus quota', () => {
      const stats = createStats({ bonusQuota: 10 });
      expect(stats.bonusQuota).toBe(10);
    });
  });

  describe('resetAt getter', () => {
    it('should return reset date', () => {
      const resetAt = new Date('2024-01-15');
      const stats = createStats({ resetAt });
      expect(stats.resetAt).toBe(resetAt);
    });
  });

  describe('lastActivityAt getter', () => {
    it('should return last activity date', () => {
      const lastActivityAt = new Date('2024-01-15T12:00:00Z');
      const stats = createStats({ lastActivityAt });
      expect(stats.lastActivityAt).toBe(lastActivityAt);
    });

    it('should return undefined when not set', () => {
      const stats = createStats({ lastActivityAt: undefined });
      expect(stats.lastActivityAt).toBeUndefined();
    });
  });

  describe('getUsagePercentage', () => {
    it('should calculate usage percentage', () => {
      const stats = createStats({ currentUsage: 3, availableQuota: 7 });
      expect(stats.getUsagePercentage()).toBe(43);
    });

    it('should return 0 when available quota is 0', () => {
      const stats = createStats({ currentUsage: 0, availableQuota: 0 });
      expect(stats.getUsagePercentage()).toBe(0);
    });

    it('should return 100 when at limit', () => {
      const stats = createStats({ currentUsage: 10, availableQuota: 10 });
      expect(stats.getUsagePercentage()).toBe(100);
    });

    it('should round percentage', () => {
      const stats = createStats({ currentUsage: 1, availableQuota: 3 });
      expect(stats.getUsagePercentage()).toBe(33);
    });
  });
});
