import { ObservabilityController } from './observability.controller';

describe('ObservabilityController', () => {
  let controller: ObservabilityController;

  beforeEach(() => {
    controller = new ObservabilityController();
  });

  describe('getMetrics', () => {
    it('should return observability metrics', async () => {
      const result = await controller.getMetrics();

      expect(result).toHaveProperty('metrics');
    });
  });

  describe('getTraces', () => {
    it('should return traces', async () => {
      const result = await controller.getTraces({} as any);

      expect(result).toHaveProperty('traces');
    });
  });
});
