import { UsageLimitsService } from './usage-limits.service';

describe('UsageLimitsService', () => {
  let service: UsageLimitsService;

  beforeEach(() => {
    service = new UsageLimitsService();
  });

  describe('getUsageStatus', () => {
    it('should return initial usage status with quota of 100', () => {
      const status = service.getUsageStatus();

      expect(status.currentUsage).toBe(0);
      expect(status.availableQuota).toBe(100);
      expect(status.canUse).toBe(true);
    });

    it('should return correct status after recording usage', () => {
      service.recordUsage();
      service.recordUsage();

      const status = service.getUsageStatus();

      expect(status.currentUsage).toBe(2);
      expect(status.availableQuota).toBe(98);
      expect(status.canUse).toBe(true);
    });

    it('should show cannot use when quota is exhausted', () => {
      const localService = new UsageLimitsService();
      for (let i = 0; i < 100; i++) {
        localService.recordUsage();
      }

      const status = localService.getUsageStatus();

      expect(status.currentUsage).toBe(100);
      expect(status.availableQuota).toBe(0);
      expect(status.canUse).toBe(false);
    });

    it('should never return negative available quota', () => {
      const localService = new UsageLimitsService();
      for (let i = 0; i < 150; i++) {
        localService.recordUsage();
      }

      const status = localService.getUsageStatus();

      expect(status.availableQuota).toBe(0);
    });
  });

  describe('recordUsage', () => {
    it('should increment usage by 1 each time', () => {
      const result1 = service.recordUsage();
      const result2 = service.recordUsage();
      const result3 = service.recordUsage();

      expect(result1.currentUsage).toBe(1);
      expect(result1.remainingQuota).toBe(99);
      expect(result2.currentUsage).toBe(2);
      expect(result2.remainingQuota).toBe(98);
      expect(result3.currentUsage).toBe(3);
      expect(result3.remainingQuota).toBe(97);
    });

    it('should track remaining quota correctly', () => {
      service.recordUsage();
      const result = service.recordUsage();

      expect(result.remainingQuota).toBe(98);
    });
  });

  describe('addBonusQuota', () => {
    it('should add positive amount to quota', () => {
      const result = service.addBonusQuota(50);

      expect(result.newTotalQuota).toBe(150);
    });

    it('should not add zero amount', () => {
      const result = service.addBonusQuota(0);

      expect(result.newTotalQuota).toBe(100);
    });

    it('should not add negative amount', () => {
      const result = service.addBonusQuota(-20);

      expect(result.newTotalQuota).toBe(100);
    });

    it('should not add non-finite number', () => {
      const result = service.addBonusQuota(NaN);

      expect(result.newTotalQuota).toBe(100);
    });

    it('should accumulate multiple bonuses', () => {
      service.addBonusQuota(25);
      const result = service.addBonusQuota(25);

      expect(result.newTotalQuota).toBe(150);
    });
  });
});
