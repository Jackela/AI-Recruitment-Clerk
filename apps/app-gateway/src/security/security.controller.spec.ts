import { SecurityController } from './security.controller';

describe('SecurityController', () => {
  let controller: SecurityController;

  beforeEach(() => {
    controller = new SecurityController();
  });

  describe('getSecurityStatus', () => {
    it('should return security status', async () => {
      const result = await controller.getSecurityStatus();

      expect(result).toHaveProperty('status');
    });
  });
});
