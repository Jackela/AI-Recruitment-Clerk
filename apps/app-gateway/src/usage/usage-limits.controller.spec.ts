import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsageLimitsController } from './usage-limits.controller';
import { UsageLimitsService } from './usage-limits.service';

describe('UsageLimitsController', () => {
  let controller: UsageLimitsController;
  let service: UsageLimitsService;

  beforeEach(() => {
    service = new UsageLimitsService();
    controller = new UsageLimitsController(service);
  });

  const mockRequest = {
    user: { id: 'user-1', email: 'test@example.com' },
  };

  const createMockContext = (): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  describe('check', () => {
    it('should return usage status', () => {
      const result = controller.check();

      expect(result).toEqual({
        currentUsage: 0,
        availableQuota: 100,
        canUse: true,
      });
    });

    it('should reflect recorded usage', () => {
      service.recordUsage();
      service.recordUsage();

      const result = controller.check();

      expect(result.currentUsage).toBe(2);
      expect(result.availableQuota).toBe(98);
    });
  });

  describe('record', () => {
    it('should record usage and return updated status', () => {
      const result = controller.record({} as any);

      expect(result.currentUsage).toBe(1);
      expect(result.remainingQuota).toBe(99);
    });

    it('should track multiple recordings', () => {
      controller.record({} as any);
      controller.record({} as any);
      const result = controller.record({} as any);

      expect(result.currentUsage).toBe(3);
    });
  });

  describe('bonus', () => {
    it('should add bonus quota', () => {
      const result = controller.bonus({ amount: 50 } as any);

      expect(result.newTotalQuota).toBe(150);
    });

    it('should handle missing amount', () => {
      const result = controller.bonus({} as any);

      expect(result.newTotalQuota).toBe(100);
    });

    it('should handle zero amount', () => {
      const result = controller.bonus({ amount: 0 } as any);

      expect(result.newTotalQuota).toBe(100);
    });
  });
});
