import { LimitsController } from './limits.controller';

describe('LimitsController', () => {
  let controller: LimitsController;

  beforeEach(() => {
    controller = new LimitsController({} as any);
  });

  describe('getLimits', () => {
    it('should get limits', async () => {
      const result = await controller.getLimits('user-123');

      expect(result).toHaveProperty('limits');
    });
  });
});
