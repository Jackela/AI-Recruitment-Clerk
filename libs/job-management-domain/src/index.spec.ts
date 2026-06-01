/**
 * Job Management Domain Index - Unit Tests
 */

import * as jobManagement from './index';

describe('Job Management Domain Index', () => {
  it('should import without errors', () => {
    expect(() => {
      require('./index');
    }).not.toThrow();
  });

  it('should export domain layer', () => {
    expect(jobManagement).toBeDefined();
    expect(typeof jobManagement).toBe('object');
  });

  it('should export Job entity', () => {
    expect(jobManagement).toHaveProperty('Job');
    expect(typeof jobManagement.Job).toBe('function');
  });

  it('should export JobService', () => {
    expect(jobManagement).toHaveProperty('JobService');
    expect(typeof jobManagement.JobService).toBe('function');
  });

  it('should export JobStatus enum', () => {
    expect(jobManagement).toHaveProperty('JobStatus');
    expect(jobManagement.JobStatus.DRAFT).toBe('draft');
    expect(jobManagement.JobStatus.ACTIVE).toBe('active');
  });

  it('should export JobType enum', () => {
    expect(jobManagement).toHaveProperty('JobType');
    expect(jobManagement.JobType.FULL_TIME).toBe('full_time');
  });

  it('should re-export all modules', async () => {
    const module = await import('./index');
    expect(module).toBeDefined();
    expect(typeof module).toBe('object');
  });

  it('should allow creating Job from main export', () => {
    const { Job, JobType } = jobManagement;
    const job = new Job({
      title: 'Test Position',
      description: 'Test description with sufficient length for validation.',
      location: { type: 'remote' },
      type: JobType.FULL_TIME,
      requirements: { skills: ['JS'], experienceYears: 1 },
      postedBy: 'user-1',
      organizationId: 'org-1',
    });

    expect(job).toBeInstanceOf(Job);
    expect(job.title).toBe('Test Position');
  });

  it('should have all key domain concepts', () => {
    const expectedExports = ['Job', 'JobService', 'JobStatus', 'JobType'];

    expectedExports.forEach((exportName) => {
      expect(jobManagement).toHaveProperty(exportName);
    });
  });
});
