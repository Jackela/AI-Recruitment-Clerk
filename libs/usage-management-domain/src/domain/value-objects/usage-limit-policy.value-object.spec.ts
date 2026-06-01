import { UsageLimitPolicy } from './usage-limit-policy.value-object';

describe('UsageLimitPolicy', () => {
  describe('createDefault', () => {
    it('should create default policy', () => {
      const policy = UsageLimitPolicy.createDefault();
      expect(policy.props.dailyLimit).toBe(5);
      expect(policy.props.bonusEnabled).toBe(true);
      expect(policy.props.maxBonusQuota).toBe(20);
      expect(policy.props.resetTimeUTC).toBe(0);
    });
  });

  describe('restore', () => {
    it('should restore from data', () => {
      const data = {
        dailyLimit: 10,
        bonusEnabled: false,
        maxBonusQuota: 50,
        resetTimeUTC: 12,
      };
      const policy = UsageLimitPolicy.restore(data);
      expect(policy.props.dailyLimit).toBe(10);
      expect(policy.props.bonusEnabled).toBe(false);
      expect(policy.props.maxBonusQuota).toBe(50);
      expect(policy.props.resetTimeUTC).toBe(12);
    });
  });

  describe('getters', () => {
    it('should get dailyLimit', () => {
      const policy = UsageLimitPolicy.restore({
        dailyLimit: 15,
        bonusEnabled: true,
        maxBonusQuota: 30,
        resetTimeUTC: 6,
      });
      expect(policy.dailyLimit).toBe(15);
    });

    it('should get bonusEnabled', () => {
      const policy = UsageLimitPolicy.restore({
        dailyLimit: 5,
        bonusEnabled: true,
        maxBonusQuota: 20,
        resetTimeUTC: 0,
      });
      expect(policy.bonusEnabled).toBe(true);
    });

    it('should get maxBonusQuota', () => {
      const policy = UsageLimitPolicy.restore({
        dailyLimit: 5,
        bonusEnabled: true,
        maxBonusQuota: 25,
        resetTimeUTC: 0,
      });
      expect(policy.maxBonusQuota).toBe(25);
    });

    it('should get resetTimeUTC', () => {
      const policy = UsageLimitPolicy.restore({
        dailyLimit: 5,
        bonusEnabled: true,
        maxBonusQuota: 20,
        resetTimeUTC: 8,
      });
      expect(policy.resetTimeUTC).toBe(8);
    });
  });
});
