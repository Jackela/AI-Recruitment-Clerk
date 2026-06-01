import { LoadTestingService } from './load-testing.service';

describe('LoadTestingService', () => {
  let service: LoadTestingService;

  beforeEach(() => {
    service = new LoadTestingService({} as any);
  });

  describe('runLoadTest', () => {
    it('should run load test', async () => {
      const result = await service.runLoadTest({ duration: 10, users: 10 });

      expect(result).toHaveProperty('requests');
      expect(result).toHaveProperty('duration');
    });
  });
});
