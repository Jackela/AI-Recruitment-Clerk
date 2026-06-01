import { SimpleJobsController } from './simple-jobs.controller';

describe('SimpleJobsController', () => {
  let controller: SimpleJobsController;

  beforeEach(() => {
    controller = new SimpleJobsController({} as any);
  });

  describe('list', () => {
    it('should list jobs', async () => {
      const result = await controller.list({} as any);

      expect(result).toHaveProperty('jobs');
    });
  });

  describe('create', () => {
    it('should create a job', async () => {
      const result = await controller.create({ title: 'Test' } as any);

      expect(result).toHaveProperty('id');
    });
  });
});
