import { UsageLimitTypesController } from './controllers/usage-limit.types';

describe('UsageLimitTypesController', () => {
  let controller: UsageLimitTypesController;

  beforeEach(() => {
    controller = new UsageLimitTypesController({} as any);
  });

  describe('getLimitTypes', () => {
    it('should get limit types', async () => {
      const result = await controller.getLimitTypes();

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
