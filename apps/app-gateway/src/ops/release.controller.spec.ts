import { ReleaseController } from './release.controller';

describe('ReleaseController', () => {
  let controller: ReleaseController;

  beforeEach(() => {
    controller = new ReleaseController();
  });

  describe('createRelease', () => {
    it('should create a release', async () => {
      const result = await controller.createRelease({
        version: '1.0.0',
      } as any);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('version');
    });
  });

  describe('getRelease', () => {
    it('should return release details', async () => {
      const result = await controller.getRelease('release-123');

      expect(result).toHaveProperty('id');
    });
  });
});
