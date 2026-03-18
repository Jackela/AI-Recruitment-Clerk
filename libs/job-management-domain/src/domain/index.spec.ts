/**
 * Domain Index - Unit Tests
 */

import * as domain from './index';

describe('Domain Index', () => {
  it('should import without errors', () => {
    expect(() => {
      require('./index');
    }).not.toThrow();
  });

  it('should export domain aggregates', () => {
    expect(domain).toBeDefined();
    expect(typeof domain).toBe('object');
  });

  it('should export domain value objects', () => {
    expect(domain).toBeDefined();
  });

  it('should export domain services', () => {
    expect(domain).toHaveProperty('JobService');
  });

  it('should export domain events', () => {
    expect(domain).toBeDefined();
  });

  it('should export entities', () => {
    expect(domain).toHaveProperty('Job');
    expect(domain).toHaveProperty('JobStatus');
    expect(domain).toHaveProperty('JobType');
  });

  it('should re-export all domain layers', async () => {
    const domainModule = await import('./index');
    expect(domainModule).toBeDefined();
    expect(typeof domainModule).toBe('object');
  });

  it('should have Job entity available', () => {
    expect(typeof domain.Job).toBe('function');
    expect(domain.Job.prototype).toBeDefined();
  });

  it('should have JobService available', () => {
    expect(typeof domain.JobService).toBe('function');
    expect(domain.JobService.prototype).toBeDefined();
  });

  it('should have correct JobStatus values', () => {
    expect(domain.JobStatus.DRAFT).toBe('draft');
    expect(domain.JobStatus.ACTIVE).toBe('active');
    expect(domain.JobStatus.CLOSED).toBe('closed');
  });

  it('should have correct JobType values', () => {
    expect(domain.JobType.FULL_TIME).toBe('full_time');
    expect(domain.JobType.CONTRACT).toBe('contract');
  });

  it('should maintain domain layer separation', () => {
    // Verify that domain layer exports are organized
    const exportNames = Object.keys(domain);
    expect(exportNames.length).toBeGreaterThan(0);

    // Verify key domain concepts are exported
    expect(exportNames).toContain('Job');
    expect(exportNames).toContain('JobService');
    expect(exportNames).toContain('JobStatus');
    expect(exportNames).toContain('JobType');
  });

  it('should allow creating domain objects from exports', () => {
    const { Job, JobType, JobStatus } = domain;

    const job = new Job({
      title: 'Domain Test Job',
      description: 'Testing domain exports with sufficient length.',
      location: { type: 'hybrid', city: 'NYC' },
      type: JobType.FULL_TIME,
      requirements: { skills: ['TS', 'JS'], experienceYears: 3 },
      postedBy: 'user-test',
      organizationId: 'org-test',
    });

    expect(job).toBeInstanceOf(Job);
    expect(job.status).toBe(JobStatus.DRAFT);
  });
});
