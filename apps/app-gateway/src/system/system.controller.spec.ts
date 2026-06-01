import { SystemController } from './system.controller';

describe('SystemController', () => {
  let controller: SystemController;

  beforeEach(() => {
    controller = new SystemController();
  });

  describe('getStatus', () => {
    it('should return system status', () => {
      const result = controller.getStatus();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('getHealth', () => {
    it('should return system health', async () => {
      const result = await controller.getHealth();

      expect(result).toHaveProperty('healthy');
    });
  });
});
