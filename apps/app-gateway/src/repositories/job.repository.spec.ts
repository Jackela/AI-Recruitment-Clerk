import { JobRepository } from './job.repository';

describe('JobRepository', () => {
  let repository: JobRepository;

  beforeEach(() => {
    repository = new JobRepository({} as any);
  });

  describe('create', () => {
    it('should create job', async () => {
      const result = await repository.create({ title: 'Test Job' });

      expect(result).toHaveProperty('id');
    });
  });

  describe('findById', () => {
    it('should find job by id', async () => {
      const result = await repository.findById('job-123');

      expect(result).toHaveProperty('id');
    });
  });
});
