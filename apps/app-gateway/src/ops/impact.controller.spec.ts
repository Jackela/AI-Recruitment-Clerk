import { ImpactController } from './impact.controller';

describe('ImpactController', () => {
  let controller: ImpactController;

  beforeEach(() => {
    controller = new ImpactController();
  });

  describe('getImpactReport', () => {
    it('should return impact report', async () => {
      const result = await controller.getImpactReport('deployment-123');

      expect(result).toHaveProperty('deploymentId');
      expect(result).toHaveProperty('impact');
    });
  });
});
