import { JobsSemanticCacheService } from './services/jobs-semantic-cache.service';

describe('JobsSemanticCacheService', () => {
  let service: JobsSemanticCacheService;

  beforeEach(() => {
    service = new JobsSemanticCacheService({} as any, {} as any);
  });

  describe('isEnabled', () => {
    it('should return enabled status', () => {
      expect(typeof service.isEnabled()).toBe('boolean');
    });
  });

  describe('tryGetSemanticCache', () => {
    it('should return null when cache miss', async () => {
      const result = await service.tryGetSemanticCache('query');

      expect(result).toBeNull();
    });
  });

  describe('getJobId', () => {
    it('should extract job ID from job object', () => {
      const job = { _id: 'job-123' };

      const result = service.getJobId(job);

      expect(result).toBe('job-123');
    });
  });
});
