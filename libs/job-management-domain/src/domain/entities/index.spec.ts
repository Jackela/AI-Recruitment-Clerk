/**
 * Entities Index - Unit Tests
 */

import * as entities from './index';

describe('Entities Index', () => {
  it('should export Job entity', () => {
    expect(entities).toHaveProperty('Job');
  });

  it('should export JobStatus enum', () => {
    expect(entities).toHaveProperty('JobStatus');
  });

  it('should export JobType enum', () => {
    expect(entities).toHaveProperty('JobType');
  });

  it('should import without errors', () => {
    expect(() => {
      require('./index');
    }).not.toThrow();
  });

  it('should have Job as a constructor', () => {
    expect(typeof entities.Job).toBe('function');
    expect(entities.Job.prototype).toBeDefined();
  });

  it('should have correct JobStatus enum values', () => {
    expect(entities.JobStatus.DRAFT).toBe('draft');
    expect(entities.JobStatus.ACTIVE).toBe('active');
    expect(entities.JobStatus.PAUSED).toBe('paused');
    expect(entities.JobStatus.CLOSED).toBe('closed');
    expect(entities.JobStatus.ARCHIVED).toBe('archived');
  });

  it('should have correct JobType enum values', () => {
    expect(entities.JobType.FULL_TIME).toBe('full_time');
    expect(entities.JobType.PART_TIME).toBe('part_time');
    expect(entities.JobType.CONTRACT).toBe('contract');
    expect(entities.JobType.FREELANCE).toBe('freelance');
    expect(entities.JobType.INTERNSHIP).toBe('internship');
  });

  it('should re-export all entity types', async () => {
    const entitiesModule = await import('./index');
    expect(entitiesModule).toBeDefined();
    expect(typeof entitiesModule).toBe('object');
    expect(entitiesModule.Job).toBeDefined();
    expect(entitiesModule.JobStatus).toBeDefined();
    expect(entitiesModule.JobType).toBeDefined();
  });

  it('should maintain entity exports structure', () => {
    // Only concrete values (classes, enums) exist at runtime
    expect(entities).toHaveProperty('Job');
    expect(entities).toHaveProperty('JobStatus');
    expect(entities).toHaveProperty('JobType');
    expect(typeof entities.Job).toBe('function');
    expect(typeof entities.JobStatus).toBe('object');
    expect(typeof entities.JobType).toBe('object');
  });

  it('should allow creating Job instance through export', () => {
    const { Job, JobType } = entities;
    const job = new Job({
      title: 'Test Job',
      description: 'This is a test job description that is long enough.',
      location: { type: 'remote' },
      type: JobType.FULL_TIME,
      requirements: { skills: ['Test'], experienceYears: 1 },
      postedBy: 'user-1',
      organizationId: 'org-1',
    });

    expect(job).toBeInstanceOf(Job);
    expect(job.title).toBe('Test Job');
  });
});
