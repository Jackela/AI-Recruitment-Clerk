import { GrayController } from './gray.controller';

describe('GrayController', () => {
  let controller: GrayController;

  beforeEach(() => {
    controller = new GrayController();
  });

  describe('getGrayStatus', () => {
    it('should return gray release status', async () => {
      const result = await controller.getGrayStatus('feature-123');

      expect(result).toHaveProperty('featureId');
      expect(result).toHaveProperty('enabled');
    });
  });

  describe('updateGrayStatus', () => {
    it('should update gray release status', async () => {
      const result = await controller.updateGrayStatus('feature-123', {
        enabled: true,
      });

      expect(result).toHaveProperty('featureId');
      expect(result).toHaveProperty('enabled');
    });
  });
});
